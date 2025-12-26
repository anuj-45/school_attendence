const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getStudentAttendance,
  getClassMonthlyReport,
  getStudentYearlyReport,
  getDailyAttendance,
  getClassYearlyReport
} = require('../controllers/reportController');

// All report routes require authentication
router.use(authenticateToken);

// More specific routes must come before parameterized routes
router.get('/student/yearly', getStudentYearlyReport);
router.get('/class/monthly', getClassMonthlyReport);
router.get('/yearly-class', getClassYearlyReport);
router.get('/daily', getDailyAttendance);
router.get('/student/:student_id', getStudentAttendance);

module.exports = router;
