const express = require('express');
const router = express.Router();
const { login, getCurrentUser, checkAdminExists, createFirstAdmin, resetPassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/check-admin', checkAdminExists);
router.post('/create-first-admin', createFirstAdmin);
router.post('/reset-password', resetPassword);

module.exports = router;
