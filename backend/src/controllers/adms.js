import biometricService from '../services/biometric/biometricService.js';

/**
 * Handle GET /iclock/cdata (Heartbeat / Handshake)
 */
export const handleCdataGet = async (req, res) => {
    const { SN } = req.query;
    console.log(`[ADMS] Heartbeat from SN: ${SN}`);
    
    // Default reply to let the device know we are alive
    res.send('OK');
};

/**
 * Handle POST /iclock/cdata (Data Push)
 * Table: ATTLOG (Attendance Logs)
 */
export const handleCdataPost = async (req, res) => {
    const { SN, table } = req.query;
    
    // Always acknowledge the device as priority #1
    res.send('OK');

    if (table !== 'ATTLOG') {
        return; 
    }

    try {
        const body = req.body;
        if (!body || typeof body !== 'string') return;

        console.log(`[ADMS] Received Data from SN:${SN}`);

        // Format of ATTLOG data lines:
        // UserID  Timestamp  VerificationType  ...
        const lines = body.trim().split('\n');
        const formattedRecords = lines.map(line => {
            const parts = line.split('\t');
            if (parts.length < 2) return null;
            
            const employeeCode = parts[0].trim();
            let timestampStr = parts[1].trim();
            
            // Ensure correct timestamp format (Indian Time +05:30)
            if (!timestampStr.includes('+')) {
                timestampStr += '+05:30';
            }

            return {
                employeeCode,
                timestamp: new Date(timestampStr).toISOString()
            };
        }).filter(Boolean);

        if (formattedRecords.length > 0) {
            console.log(`[ADMS] SN:${SN} Pushing ${formattedRecords.length} records to Cloud...`);
            await biometricService.processSync({
                rawRecords: formattedRecords,
                deviceIP: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'CLOUD-ADMS',
                userId: null, // System-triggered
                filename: `ADMS_PUSH_${SN}_${new Date().toISOString()}`
            });
        }

    } catch (error) {
        console.error('[ADMS] Sync Error:', error.message);
    }
};

/**
 * Handle GET /iclock/getrequest (Server to Device commands)
 */
export const handleGetRequest = async (req, res) => {
    // Standard reply: No pending commands (e.g. OK)
    res.send('OK');
};

/**
 * Handle POST /iclock/devicecmd (Acknowledge commands)
 */
export const handleDeviceCmd = async (req, res) => {
    res.send('OK');
};
