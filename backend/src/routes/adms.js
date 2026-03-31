import express from 'express';
import { handleCdataGet, handleCdataPost, handleGetRequest, handleDeviceCmd } from '../controllers/adms.js';

const router = express.Router();

// IClock/ADMS standard endpoints
router.get('/cdata', handleCdataGet);      // Heartbeat & Init
router.post('/cdata', handleCdataPost);    // Attendance & Op Log Push

router.get('/getrequest', handleGetRequest); // Server commands
router.post('/devicecmd', handleDeviceCmd);  // Command acknowledgment

export default router;
