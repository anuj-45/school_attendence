const express = require('express');
const router = express.Router();
const {
  checkSchoolExists,
  registerSchool,
  getSchoolByUdise,
  getAllSchools
} = require('../controllers/schoolController');

// Check if any school exists
router.get('/check', checkSchoolExists);

// Register a new school
router.post('/register', registerSchool);

// Get school by UDISE code
router.get('/udise/:udise_code', getSchoolByUdise);

// Get all schools (optional)
router.get('/all', getAllSchools);

module.exports = router;
