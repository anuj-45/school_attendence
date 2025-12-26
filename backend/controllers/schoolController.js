const db = require('../config/db');

// Check if any school is registered
const checkSchoolExists = async (req, res) => {
  try {
    const [schools] = await db.query('SELECT COUNT(*) as count FROM schools');
    res.json({ exists: schools[0].count > 0 });
  } catch (error) {
    console.error('Check school exists error:', error);
    res.status(500).json({ error: 'Failed to check school registration' });
  }
};

// Register a new school
const registerSchool = async (req, res) => {
  try {
    const { school_name, udise_code, principal, smtp_email, smtp_password } = req.body;

    // Validate required fields
    if (!school_name || !udise_code || !principal) {
      return res.status(400).json({ error: 'All fields are required: school_name, udise_code, principal' });
    }

    // Validate UDISE code format (should be alphanumeric)
    if (!/^[A-Z0-9]{11}$/.test(udise_code)) {
      return res.status(400).json({ error: 'Invalid UDISE code format. Must be 11 alphanumeric characters' });
    }

    // Validate email if provided
    if (smtp_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtp_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if UDISE code already exists
    const [existing] = await db.query('SELECT id FROM schools WHERE udise_code = ?', [udise_code]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'School with this UDISE code already registered' });
    }

    // Insert new school with email settings
    const [result] = await db.query(
      'INSERT INTO schools (school_name, udise_code, principal, smtp_email, smtp_password) VALUES (?, ?, ?, ?, ?)',
      [school_name, udise_code, principal, smtp_email || null, smtp_password || null]
    );

    res.status(201).json({
      message: 'School registered successfully',
      school_id: result.insertId,
      school_name,
      udise_code
    });
  } catch (error) {
    console.error('Register school error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'School with this UDISE code already registered' });
    }
    
    res.status(500).json({ error: 'Failed to register school' });
  }
};

// Get school details by UDISE code
const getSchoolByUdise = async (req, res) => {
  try {
    const { udise_code } = req.params;

    const [schools] = await db.query(
      'SELECT id, school_name, udise_code, principal, created_at FROM schools WHERE udise_code = ?',
      [udise_code]
    );

    if (schools.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(schools[0]);
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ error: 'Failed to retrieve school details' });
  }
};

// Get all registered schools (for admin purposes if needed)
const getAllSchools = async (req, res) => {
  try {
    const [schools] = await db.query(
      'SELECT id, school_name, udise_code, principal, created_at FROM schools ORDER BY school_name'
    );

    res.json(schools);
  } catch (error) {
    console.error('Get all schools error:', error);
    res.status(500).json({ error: 'Failed to retrieve schools' });
  }
};

module.exports = {
  checkSchoolExists,
  registerSchool,
  getSchoolByUdise,
  getAllSchools
};
