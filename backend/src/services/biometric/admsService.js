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

            if (device?.attlogStamp) {
                return device.attlogStamp;
            }
        } catch (error) {
            console.warn('[ADMS] Could not read device stamp:', error.message);
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
    }

    buildOptionsResponse(serialNumber, attlogStamp = 0) {
        return [
            `GET OPTION FROM: ${serialNumber}`,
            `ATTLOGStamp=${attlogStamp}`,
            `OPERLOGStamp=0`,
            `BIODATAStamp=0`,
            `ATTPHOTOStamp=0`,
            `ErrorDelay=60`,
            `Delay=5`,
            `TransTimes=00:00;14:00`,
            `TransInterval=1`,
            `TransFlag=TransData AttLog OpLog AttPhoto EnrollUser ChgUser EnrollFP ChgFP`,
            `TimeZone=5:30`,
            `Realtime=1`,
            `Encrypt=0`,
            `ServerVer=3.0.1`,
            `PushProtVer=2.4.1`,
            `SupportPing=1`
        ].join('\n');
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
        const frontendUrl = process.env.FRONTEND_URL || 'https://hrms.tectratechnologies.com';
        const host = new URL(frontendUrl).host;

        return {
            syncMode: 'wifi_push',
            serverHost: host,
            serverPort: 443,
            serverProtocol: 'https',
            pushPath: '/iclock/cdata',
            pushUrl: `https://${host}/iclock/cdata`,
            heartbeatPath: '/iclock/getrequest',
            realtime: true,
            instructions: [
                'Connect the eSSL device to office WiFi.',
                'Open device menu → Communication → Cloud Server / ADMS.',
                'Set Server Mode to ADMS or Cloud Server.',
                `Set Server Address to ${host}`,
                'Set Server Port to 443 and enable HTTPS if available.',
                'Set Server Path to /iclock/cdata (or leave blank if only host is asked).',
                'Save settings and reboot the device once.'
            ]
        };
    }
}

export default new AdmsService();
