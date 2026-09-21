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

// eSSL/ZKTeco push firmware probes these — 404 here stops ATTLOG upload.
const okPing = (req, res) => {
    const sn = String(req.query.SN || '').trim();
    console.log(`[ADMS] ping/root from SN:${sn || 'unknown'} ${req.method} ${req.path}`);
    res.status(200);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'no-store');
    return res.send('OK');
};

router.get(['/ping', '/ping.aspx'], okPing);
router.post(['/ping', '/ping.aspx'], okPing);
router.get('/', okPing);

// Log unknown /iclock paths (must not use path '*" — breaks Express 5 / path-to-regexp).
router.use((req, res) => {
    console.log(`[ADMS] UNHANDLED ${req.method} ${req.originalUrl}`);
    res.status(200);
    res.set('Content-Type', 'text/plain; charset=utf-8');
    return res.send('OK');
});

export default router;
