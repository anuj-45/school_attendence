const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAbsentStudents,
  sendNotifications,
  getMessageHistory
} = require('../controllers/messagingController');

// All messaging routes require authentication
router.use(authenticateToken);

// Get absent students for a date
router.get('/absent-students', getAbsentStudents);

// Send notifications to parents
router.post('/send', sendNotifications);

// Get message history
router.get('/history', getMessageHistory);

module.exports = router;
