import biometricService from '../services/biometric/biometricService.js';
import admsService, { parseAttlogRecords, parseUserInfoRecords } from '../services/biometric/admsService.js';
import { getIo } from '../config/socket.js';

const clientIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'ADMS-WIFI';

const sendPlain = (res, body, status = 200) => {
    res.status(status);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Date', new Date().toUTCString());
    res.set('Cache-Control', 'no-store');
    return res.send(body);
};

async function processPunchRecords(records, req, serialNumber, tableName) {
    if (!records.length) return;

    const latestTimestamp = records.reduce((max, record) => {
        if (!max || new Date(record.timestamp) > new Date(max)) {
            return record.timestamp;
        }
        return max;
    }, null);

    const result = await biometricService.processSync({
        rawRecords: records,
        deviceIP: `ADMS-WIFI-${serialNumber || 'DEVICE'}`,
        userId: null,
        filename: `ADMS_PUSH_${serialNumber || 'UNKNOWN'}_${tableName}_${new Date().toISOString()}`
    });

    if (serialNumber) {
        await admsService.markPush(serialNumber, latestTimestamp);
    }

    const io = getIo();
    if (io && result.status !== 'SKIPPED') {
        io.emit('biometricSyncUpdate', {
            status: result.status,
            total: result.totalProcessed,
            success: result.successCount,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Device initialization / heartbeat.
 * GET /iclock/cdata?SN=...&options=all
 */
export const handleCdataGet = async (req, res) => {
    const serialNumber = String(req.query.SN || '').trim();
    const options = String(req.query.options || '').trim().toLowerCase();
    const ip = clientIp(req);

    try {
        if (serialNumber) {
            await admsService.touchDevice(serialNumber, ip);
        }

        if (options === 'all' && serialNumber) {
            const attlogStamp = await admsService.getAttlogStamp(serialNumber);
            console.log(`[ADMS] Init config for SN:${serialNumber} stamp=${attlogStamp}`);
            return sendPlain(res, admsService.buildOptionsResponse(serialNumber, attlogStamp));
        }

        console.log(`[ADMS] Heartbeat from SN:${serialNumber || 'unknown'}`);
        return sendPlain(res, 'OK');
    } catch (error) {
        console.error('[ADMS] GET error:', error.message);
        return sendPlain(res, 'OK');
    }
};

/**
 * WiFi punch upload from device.
 * POST /iclock/cdata?SN=...&table=ATTLOG
 */
export const handleCdataPost = async (req, res) => {
    const serialNumber = String(req.query.SN || '').trim();
    const table = String(req.query.table || req.query.Table || '').trim().toUpperCase();
    const ip = clientIp(req);

    // Devices expect an immediate OK before the server processes the payload.
    sendPlain(res, 'OK');

    if (!table) return;

    try {
        if (serialNumber) {
            await admsService.touchDevice(serialNumber, ip);
        }

        const body = req.body;

        if (table === 'ATTLOG') {
            const records = parseAttlogRecords(body);
            if (records.length > 0) {
                console.log(`[ADMS] SN:${serialNumber} uploaded ${records.length} ATTLOG record(s)`);
                await processPunchRecords(records, req, serialNumber, table);
            }
            return;
        }

        if (table === 'USER' || table === 'USERINFO') {
            const users = parseUserInfoRecords(body);
            if (users.length > 0) {
                const created = await biometricService.ensureUsersExistFromRecords(users);
                console.log(`[ADMS] SN:${serialNumber} synced ${users.length} user row(s), created ${created}`);
            }
            return;
        }

        if (table === 'OPTIONS' || table === 'OPERLOG') {
            const payload = typeof body === 'string' ? body : JSON.stringify(body || {});
            console.log(`[ADMS] SN:${serialNumber} posted ${table} payload (${payload.length} bytes)`);
        }
    } catch (error) {
        console.error('[ADMS] POST error:', error.message);
    }
};

/**
 * Device polls for server-side commands.
 * GET /iclock/getrequest?SN=...
 */
export const handleGetRequest = async (req, res) => {
    const serialNumber = String(req.query.SN || '').trim();
    try {
        if (serialNumber) {
            await admsService.touchDevice(serialNumber, clientIp(req));
        }
    } catch (error) {
        console.error('[ADMS] getrequest touch failed:', error.message);
    }
    return sendPlain(res, 'OK');
};

/**
 * Device command acknowledgement.
 * POST /iclock/devicecmd
 */
export const handleDeviceCmd = async (req, res) => {
    const serialNumber = String(req.query.SN || '').trim();
    try {
        if (serialNumber) {
            await admsService.touchDevice(serialNumber, clientIp(req));
        }
    } catch (error) {
        console.error('[ADMS] devicecmd touch failed:', error.message);
    }
    return sendPlain(res, 'OK');
};

/**
 * Optional registry endpoint used by some firmware builds.
 */
export const handleRegistry = async (req, res) => {
    const serialNumber = String(req.query.SN || req.body?.SN || '').trim();
    try {
        if (serialNumber) {
            await admsService.touchDevice(serialNumber, clientIp(req));
        }
    } catch (error) {
        console.error('[ADMS] registry touch failed:', error.message);
    }
    return sendPlain(res, 'OK');
};
