import prisma from '../../config/prisma.js';

const DEVICE_TZ = '+05:30';

function normalizeBody(raw) {
    if (raw == null) return '';
    if (Buffer.isBuffer(raw)) return raw.toString('utf8');
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') {
        if (typeof raw.raw === 'string') return raw.raw;
        return Object.entries(raw).map(([key, value]) => `${key}=${value}`).join('\t');
    }
    return String(raw);
}

function toIsoTimestamp(raw) {
    const value = String(raw || '').trim();
    if (!value) return null;

    const normalized = value.includes('T')
        ? value
        : value.replace(' ', 'T');

    const parsed = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)
        ? new Date(normalized)
        : new Date(`${normalized}${DEVICE_TZ}`);

    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseKeyValueLine(line) {
    const pairs = {};
    for (const chunk of line.split(/\t+/)) {
        const match = chunk.match(/^([^=]+)=(.+)$/);
        if (match) {
            pairs[match[1].trim()] = match[2].trim();
        }
    }
    return pairs;
}

/**
 * Parse ATTLOG payloads from eSSL/ZKTeco WiFi push devices.
 * Supports tab-separated, space-separated, and PIN=/DateTime= formats.
 */
export function parseAttlogRecords(body) {
    const text = normalizeBody(body).trim();
    if (!text) return [];

    const records = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const kv = parseKeyValueLine(trimmed);
        if (kv.PIN && (kv.DateTime || kv.Time)) {
            const timestamp = toIsoTimestamp(kv.DateTime || kv.Time);
            if (timestamp) {
                records.push({ employeeCode: kv.PIN, timestamp });
            }
            continue;
        }

        const tabParts = trimmed.split('\t').map((part) => part.trim()).filter(Boolean);
        if (tabParts.length >= 2) {
            const timestamp = toIsoTimestamp(tabParts[1]);
            if (timestamp) {
                records.push({ employeeCode: tabParts[0], timestamp });
            }
            continue;
        }

        const spaceMatch = trimmed.match(/^(\S+)\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/);
        if (spaceMatch) {
            const timestamp = toIsoTimestamp(spaceMatch[2]);
            if (timestamp) {
                records.push({ employeeCode: spaceMatch[1], timestamp });
            }
        }
    }

    return records;
}

export function parseUserInfoRecords(body) {
    const text = normalizeBody(body).trim();
    if (!text) return [];

    const records = [];
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const kv = parseKeyValueLine(trimmed);
        const employeeCode = kv.PIN || kv.uid || kv.UserID;
        if (!employeeCode) continue;

        records.push({
            employeeCode,
            employeeName: kv.Name || kv.name || `Employee ${employeeCode}`
        });
    }

    return records;
}

function stampFromIso(isoTimestamp) {
    if (!isoTimestamp) return 0;
    return Math.floor(new Date(isoTimestamp).getTime() / 1000);
}

class AdmsService {
    async touchDevice(serialNumber, ipAddress = null) {
        if (!serialNumber) return null;

        try {
            return await prisma.admsDevice.upsert({
                where: { serialNumber },
                update: {
                    lastSeenAt: new Date(),
                    ...(ipAddress ? { lastIp: ipAddress } : {})
                },
                create: {
                    serialNumber,
                    lastSeenAt: new Date(),
                    lastIp: ipAddress
                }
            });
        } catch (error) {
            console.warn('[ADMS] Could not persist device heartbeat:', error.message);
            return null;
        }
    }

    async markPush(serialNumber, latestTimestampIso = null) {
        if (!serialNumber) return;

        const attlogStamp = stampFromIso(latestTimestampIso);
        try {
            await prisma.admsDevice.upsert({
                where: { serialNumber },
                update: {
                    lastPushAt: new Date(),
                    lastSeenAt: new Date(),
                    ...(attlogStamp ? { attlogStamp } : {})
                },
                create: {
                    serialNumber,
                    lastPushAt: new Date(),
                    lastSeenAt: new Date(),
                    attlogStamp
                }
            });
        } catch (error) {
            console.warn('[ADMS] Could not persist push stamp:', error.message);
        }
    }

    async getAttlogStamp(serialNumber) {
        try {
            const device = serialNumber
                ? await prisma.admsDevice.findUnique({ where: { serialNumber } })
                : null;

            // 0 is a valid stamp (means "re-upload from beginning"). Do not treat it as missing.
            if (device && device.attlogStamp != null) {
                return Number(device.attlogStamp) || 0;
            }

            const latest = await prisma.biometricAttendance.findFirst({
                where: {
                    deviceIP: {
                        contains: 'ADMS'
                    }
                },
                orderBy: { timestamp: 'desc' },
                select: { timestamp: true }
            });

            return stampFromIso(latest?.timestamp?.toISOString());
        } catch (error) {
            console.warn('[ADMS] Could not read device stamp:', error.message);
            return 0;
        }
    }

    buildOptionsResponse(serialNumber, attlogStamp = 0) {
        // Include both Stamp and ATTLOGStamp — older eSSL firmware reads Stamp= only.
        return [
            `GET OPTION FROM: ${serialNumber}`,
            `Stamp=${attlogStamp}`,
            `ATTLOGStamp=${attlogStamp}`,
            `OPERLOGStamp=0`,
            `BIODATAStamp=0`,
            `ATTPHOTOStamp=0`,
            `ErrorDelay=30`,
            `Delay=1`,
            `TransTimes=00:00;23:59`,
            `TransInterval=1`,
            `TransFlag=1111000000`,
            `TimeZone=5:30`,
            `Realtime=1`,
            `Encrypt=0`,
            `ServerVer=2.4.1`,
            `PushProtVer=2.4.1`,
            `SupportPing=1`
        ].join('\n');
    }

    async resetAttlogStamp(serialNumber = null) {
        if (serialNumber) {
            return prisma.admsDevice.updateMany({
                where: { serialNumber },
                data: { attlogStamp: 0, lastPushAt: null }
            });
        }
        return prisma.admsDevice.updateMany({
            data: { attlogStamp: 0, lastPushAt: null }
        });
    }

    async getWifiStatus() {
        let latestDevice = null;
        try {
            latestDevice = await prisma.admsDevice.findFirst({
                orderBy: { lastSeenAt: 'desc' }
            });
        } catch (error) {
            console.warn('[ADMS] Could not read WiFi device status:', error.message);
        }

        const latestPunch = await prisma.biometricAttendance.findFirst({
            where: { deviceIP: { contains: 'ADMS' } },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true, createdAt: true }
        });

        const lastSeenAt = latestDevice?.lastSeenAt || latestPunch?.createdAt || null;
        const lastPunchAt = latestPunch?.timestamp?.toISOString() || null;
        const minutesSinceLastSeen = lastSeenAt
            ? Math.round((Date.now() - new Date(lastSeenAt).getTime()) / 60000)
            : null;

        let status = 'offline';
        if (minutesSinceLastSeen !== null) {
            if (minutesSinceLastSeen <= 10) status = 'online';
            else if (minutesSinceLastSeen <= 180) status = 'stale';
        }

        return {
            syncMode: 'wifi_push',
            status,
            deviceSerial: latestDevice?.serialNumber || null,
            lastSeenAt: lastSeenAt?.toISOString() || null,
            lastPunchAt,
            minutesSinceLastSeen
        };
    }

    getPushConfig() {
        // Direct eSSL WiFi → VPS (no laptop). IP + 5001 works on devices that cannot type a domain.
        const frontendUrl = process.env.FRONTEND_URL || 'https://hrms.tectratechnologies.com';
        const host = process.env.ADMS_SERVER_HOST?.trim() || '157.173.218.57';
        const port = Number(process.env.ADMS_SERVER_PORT || 80);
        const useHttps = process.env.ADMS_USE_HTTPS === 'true';
        const pushPath = process.env.ADMS_PUSH_PATH?.trim() || '/iclock/cdata';
        const protocol = useHttps ? 'https' : 'http';
        const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);

        return {
            syncMode: 'wifi_push',
            connectionMode: isIp ? 'ip_direct' : (useHttps ? 'domain_https' : 'domain_http'),
            serverHost: host,
            serverPort: port,
            serverProtocol: protocol,
            enableDomainName: !isIp,
            enableProxy: false,
            pushPath,
            pushUrl: `${protocol}://${host}${port === 80 || port === 443 ? '' : `:${port}`}${pushPath}`,
            heartbeatPath: '/iclock/getrequest',
            realtime: true,
            instructions: [
                'Stop any laptop/office bridge (pm2 stop biometric-bridge). Device must talk to the cloud alone.',
                'Connect the eSSL device to office WiFi with internet access.',
                'Open Communication → Cloud Server Setting.',
                'Set Server Mode = ADMS.',
                `Set Enable Domain Name = ${isIp ? 'OFF' : 'ON'}.`,
                `Set Server Address = ${host}`,
                `Set Server Port = ${port}`,
                'Set Enable Proxy Server = OFF (never leave Proxy IP as 0.0.0.0).',
                'Leave path blank / default (/iclock/cdata).',
                'Save, reboot the device, punch once — no laptop required.'
            ]
        };
    }
}

export default new AdmsService();
