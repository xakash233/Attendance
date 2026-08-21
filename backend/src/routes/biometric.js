import express from 'express';
import {
    syncBiometricUpload,
    getSyncLogs,
    getLatestRecords,
    syncFromDevice,
    syncUsersFromDevice,
    agentSyncBiometric,
    getSyncHeartbeat,
    getBridgeHealth,
    getBridgeStatus,
    getPushConfig
} from '../controllers/biometric.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
    handleCdataGet,
    handleCdataPost,
    handleGetRequest,
    handleDeviceCmd,
    handleRegistry
} from '../controllers/adms.js';

const router = express.Router();

// Public ping so you can verify WiFi ADMS routes are deployed.
router.get('/adms/ping', (_req, res) => {
    res.json({ ok: true, service: 'essl-wifi-adms', ts: new Date().toISOString() });
});

const admsDeviceRouter = express.Router();
admsDeviceRouter.use(express.raw({ type: '*/*', limit: '10mb' }));
admsDeviceRouter.use((req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
        req.body = req.body.toString('utf8');
    }
    next();
});
admsDeviceRouter.get(['/cdata', '/cdata.aspx'], handleCdataGet);
admsDeviceRouter.post(['/cdata', '/cdata.aspx'], handleCdataPost);
admsDeviceRouter.get(['/getrequest', '/getrequest.aspx'], handleGetRequest);
admsDeviceRouter.post(['/devicecmd', '/devicecmd.aspx'], handleDeviceCmd);
admsDeviceRouter.get(['/registry', '/registry.aspx'], handleRegistry);
admsDeviceRouter.post(['/registry', '/registry.aspx'], handleRegistry);
router.use('/adms', admsDeviceRouter);

router.get('/bridge-health', getBridgeHealth);
router.post('/agent-sync', agentSyncBiometric);
router.post('/sync', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), upload.single('file'), syncBiometricUpload);
router.post('/sync-device', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), syncFromDevice);
router.post('/sync-users', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), syncUsersFromDevice);
router.get('/logs', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getSyncLogs);
router.get('/records', protect, getLatestRecords);
router.get('/heartbeat', protect, getSyncHeartbeat);
router.get('/status', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getBridgeStatus);
router.get('/push-config', protect, authorize('SUPER_ADMIN', 'ADMIN', 'HR'), getPushConfig);

export default router;
