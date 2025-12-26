const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  getAllStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  getAllTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  getAllClasses,
  addClass,
  updateClass,
  deleteClass,
  getAllHolidays,
  addHoliday,
  deleteHoliday,
  editPastAttendance,
  promoteStudents
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authenticateToken, authorizeRole('admin'));

// Student routes
router.get('/students', getAllStudents);
router.post('/students', addStudent);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);
router.post('/students/bulk-delete', bulkDeleteStudents);
router.post('/promote-students', promoteStudents);

// Teacher routes
router.get('/teachers', getAllTeachers);
router.post('/teachers', addTeacher);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);

// Class routes
router.get('/classes', getAllClasses);
router.post('/classes', addClass);
router.put('/classes/:id', updateClass);
router.delete('/classes/:id', deleteClass);

// Holiday routes
router.get('/holidays', getAllHolidays);
router.post('/holidays', addHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Attendance editing
router.post('/attendance/edit', editPastAttendance);

module.exports = router;
