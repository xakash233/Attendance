import express from 'express';
import {
    handleCdataGet,
    handleCdataPost,
    handleGetRequest,
    handleDeviceCmd,
    handleRegistry
} from '../controllers/adms.js';

const router = express.Router();

// Raw body must be captured before JSON/urlencoded parsers elsewhere in the app.
router.use(express.raw({ type: '*/*', limit: '10mb' }));
router.use((req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
        req.body = req.body.toString('utf8');
    }
    next();
});

router.get(['/cdata', '/cdata.aspx'], handleCdataGet);
router.post(['/cdata', '/cdata.aspx'], handleCdataPost);
router.get(['/getrequest', '/getrequest.aspx'], handleGetRequest);
router.post(['/devicecmd', '/devicecmd.aspx'], handleDeviceCmd);
router.get(['/registry', '/registry.aspx'], handleRegistry);
router.post(['/registry', '/registry.aspx'], handleRegistry);

export default router;
