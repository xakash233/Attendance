import express from 'express';
import { handleCdataGet, handleCdataPost, handleGetRequest, handleDeviceCmd } from '../controllers/adms.js';

const router = express.Router();

// Middleware to capture RAW text body from biometric devices (needed for legacy ADMS protocol)
router.use(express.text({ type: '*/*', limit: '10mb' }));

// IClock/ADMS standard endpoints (Supporting both /cdata and /cdata.aspx formats)
router.get(['/cdata', '/cdata.aspx'], handleCdataGet);      
router.post(['/cdata', '/cdata.aspx'], handleCdataPost);    

router.get(['/getrequest', '/getrequest.aspx'], handleGetRequest); 
router.post(['/devicecmd', '/devicecmd.aspx'], handleDeviceCmd);

export default router;
