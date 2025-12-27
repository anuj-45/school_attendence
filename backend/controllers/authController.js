const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Login
const login = async (req, res) => {
  try {
    const { username, password, udise_code } = req.body;

    if (!username || !password || !udise_code) {
      return res.status(400).json({ error: 'Username, password, and UDISE code are required' });
    }

    // First, find the school by UDISE code
    const schoolsResult = await db.query('SELECT id, school_name FROM schools WHERE udise_code = $1', [udise_code]);
    
    if (schoolsResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid school UDISE code' });
    }

    const school = schoolsResult.rows[0];

    // Find user in that specific school
    const usersResult = await db.query(
      'SELECT * FROM users WHERE username = $1 AND school_id = $2', 
      [username, school.id]
    );

    if (usersResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = usersResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, school_id: school.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        school_id: school.id,
        school_name: school.school_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user info
const getCurrentUser = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT u.id, u.username, u.full_name, u.email, u.role, u.school_id, s.school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if any admin exists for a specific school
const checkAdminExists = async (req, res) => {
  try {
    const { udise_code } = req.query;
    
    if (!udise_code) {
      return res.status(400).json({ error: 'UDISE code is required' });
    }

    // Find school
    const schoolsResult = await db.query('SELECT id FROM schools WHERE udise_code = $1', [udise_code]);
    
    if (schoolsResult.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Check for admin in this school
    const adminsResult = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1 AND school_id = $2', 
      ['admin', schoolsResult.rows[0].id]
    );
    
    res.json({ adminExists: parseInt(adminsResult.rows[0].count) > 0 });
  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create admin account for a school
const createFirstAdmin = async (req, res) => {
  try {
    const { username, password, full_name, email, udise_code } = req.body;

    if (!username || !password || !full_name || !udise_code) {
      return res.status(400).json({ error: 'Username, password, full name, and UDISE code are required' });
    }

    // Find school
    const schoolsResult = await db.query('SELECT id FROM schools WHERE udise_code = $1', [udise_code]);
    
    if (schoolsResult.rows.length === 0) {
      return res.status(404).json({ error: 'School not found. Please register your school first.' });
    }

    const school_id = schoolsResult.rows[0].id;
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (school_id, username, password, full_name, email, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [school_id, username, hashedPassword, full_name, email, 'admin']
    );

    res.status(201).json({ 
      message: 'Admin account created successfully. Please login.',
      userId: result.rows[0].id 
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username already exists in your school' });
    }
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset password - generates temporary password
const resetPassword = async (req, res) => {
  try {
    const { username, udise_code } = req.body;

    if (!username || !udise_code) {
      return res.status(400).json({ error: 'Username and UDISE code are required' });
    }

    // Find school
    const schoolsResult = await db.query('SELECT id FROM schools WHERE udise_code = $1', [udise_code]);
    
    if (schoolsResult.rows.length === 0) {
      return res.status(404).json({ error: 'School not found with this UDISE code' });
    }

    const school_id = schoolsResult.rows[0].id;

    // Find user
    const usersResult = await db.query(
      'SELECT id, full_name, role FROM users WHERE username = $1 AND school_id = $2',
      [username, school_id]
    );

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with this username' });
    }

    const user = usersResult.rows[0];

    // Generate temporary password (username + last 4 digits of timestamp)
    const tempPassword = username + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ 
      message: 'Password reset successful',
      temporaryPassword: tempPassword,
      username: username,
      fullName: user.full_name,
      role: user.role
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = { login, getCurrentUser, checkAdminExists, createFirstAdmin, resetPassword };
