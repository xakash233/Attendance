import express from 'express';
import { applyWFH, listWFH, getUserWFH } from '../controllers/wfh.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/apply', applyWFH);
router.get('/list', authorize('SUPER_ADMIN', 'ADMIN', 'HR'), listWFH);
router.get('/my-wfh', getUserWFH);

export default router;
