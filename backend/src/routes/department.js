import express from 'express';
import { getDepartments, createDepartment, assignHr, deleteDepartment } from '../controllers/department.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN'), getDepartments);
router.post('/', protect, authorize('SUPER_ADMIN', 'ADMIN'), createDepartment);
router.put('/:id/hr', protect, authorize('SUPER_ADMIN', 'ADMIN'), assignHr);
router.delete('/:id', protect, authorize('SUPER_ADMIN'), deleteDepartment);

export default router;
