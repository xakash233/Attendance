const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment, assignHr } = require('../controllers/department');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN'), getDepartments);
router.post('/', protect, authorize('SUPER_ADMIN', 'ADMIN'), createDepartment);
router.put('/:id/hr', protect, authorize('SUPER_ADMIN', 'ADMIN'), assignHr);

module.exports = router;
