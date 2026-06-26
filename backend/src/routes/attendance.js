import express from 'express';
import { 
    checkIn, 
    checkOut, 
    getHistory, 
    getSummary, 
    getLiveAttendance, 
    getDashboardReport,
    getComplianceReport,
    exportComplianceReport,
    exportTectraAttendanceSheet,
    syncTectraAttendanceSheet,
    getWeeklySummary,
    getAdminAnalytics
} from '../controllers/attendance.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.get('/history', protect, getHistory);
router.get('/summary', protect, getSummary);
router.get('/weekly-summary', protect, getWeeklySummary);
router.get('/user-summary/:id', protect, authorize('SUPER_ADMIN', 'HR', 'ADMIN', 'EMPLOYEE'), getSummary);
router.get('/live', protect, getLiveAttendance);
router.get('/dashboard-report', protect, getDashboardReport);
router.get('/compliance-report', protect, getComplianceReport);
router.get('/export-compliance', protect, exportComplianceReport);
router.get('/export-tectra-sheet', protect, authorize('SUPER_ADMIN', 'HR', 'ADMIN'), exportTectraAttendanceSheet);
router.post('/sync-tectra-sheet', protect, authorize('SUPER_ADMIN', 'HR', 'ADMIN'), syncTectraAttendanceSheet);
router.get('/admin-analytics', protect, authorize('SUPER_ADMIN', 'HR', 'ADMIN'), getAdminAnalytics);

export default router;
