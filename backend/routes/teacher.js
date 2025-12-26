const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  getMyClass,
  getMyStudents,
  getAttendanceByDate,
  markAttendance
} = require('../controllers/teacherController');

// All teacher routes require authentication and teacher role
router.use(authenticateToken, authorizeRole('teacher'));

router.get('/class', getMyClass);
router.get('/students', getMyStudents);
router.get('/attendance/:date', getAttendanceByDate);
router.post('/attendance', markAttendance);

module.exports = router;
