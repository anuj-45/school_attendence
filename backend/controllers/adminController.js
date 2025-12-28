const bcrypt = require('bcrypt');
const db = require('../config/db');

// Get all students
const getAllStudents = async (req, res) => {
  try {
    const { academic_year, class_id } = req.query;
    const school_id = req.user.school_id;
    
    let query = `
      SELECT s.*, c.standard, c.section, c.academic_year as class_academic_year
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE c.school_id = $1
    `;
    const params = [school_id];
    let paramIndex = 2;

    if (academic_year) {
      query += ` AND s.academic_year = $${paramIndex}`;
      params.push(academic_year);
      paramIndex++;
    }
    if (class_id) {
      query += ` AND s.class_id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }

    query += ' ORDER BY c.standard, c.section, s.roll_number';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add student
const addStudent = async (req, res) => {
  try {
    const { roll_number, admission_no, name, class_id, academic_year, gender, parent_contact, parent_email } = req.body;

    if (!roll_number || !name || !class_id || !academic_year || !gender || !parent_email) {
      return res.status(400).json({ error: 'Roll number, name, class, academic year, gender, and parent email are required' });
    }

    if (!['male', 'female'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be either male or female' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parent_email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Validate phone number if provided (10 digits or with country code)
    if (parent_contact) {
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      const cleanedPhone = parent_contact.replace(/[\s\-]/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number' });
      }
    }

    const result = await db.query(
      'INSERT INTO students (roll_number, admission_no, name, class_id, academic_year, gender, parent_contact, parent_email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [roll_number, admission_no || null, name, class_id, academic_year, gender, parent_contact || null, parent_email]
    );

    res.status(201).json({ message: 'Student added successfully', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Roll number already exists for this class and year' });
    }
    console.error('Add student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { roll_number, admission_no, name, class_id, academic_year, gender, parent_contact, parent_email } = req.body;

    if (!parent_email) {
      return res.status(400).json({ error: 'Parent email is required' });
    }

    if (gender && !['male', 'female'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be either male or female' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parent_email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Validate phone number if provided (10 digits or with country code)
    if (parent_contact) {
      const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
      const cleanedPhone = parent_contact.replace(/[\s\-]/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number' });
      }
    }

    const result = await db.query(
      'UPDATE students SET roll_number = $1, admission_no = $2, name = $3, class_id = $4, academic_year = $5, gender = $6, parent_contact = $7, parent_email = $8 WHERE id = $9',
      [roll_number, admission_no || null, name, class_id, academic_year, gender, parent_contact || null, parent_email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Roll number already exists for this class and year' });
    }
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM students WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk delete students by academic year
const bulkDeleteStudents = async (req, res) => {
  try {
    const { academic_year } = req.body;

    if (!academic_year) {
      return res.status(400).json({ error: 'Academic year is required' });
    }

    const result = await db.query('DELETE FROM students WHERE academic_year = $1', [academic_year]);

    res.json({ message: `Deleted ${result.rowCount} students from academic year ${academic_year}` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all teachers
const getAllTeachers = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const result = await db.query(`
      SELECT u.*, c.id as class_id, c.standard, c.section, c.academic_year
      FROM users u
      LEFT JOIN classes c ON u.id = c.teacher_id
      WHERE u.role = 'teacher' AND u.school_id = $1
      ORDER BY u.full_name
    `, [school_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add teacher
const addTeacher = async (req, res) => {
  try {
    const { username, password, full_name, email } = req.body;
    const school_id = req.user.school_id;

    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (school_id, username, password, full_name, email, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [school_id, username, hashedPassword, full_name, email, 'teacher']
    );

    res.status(201).json({ message: 'Teacher added successfully', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Add teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update teacher
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, email, password } = req.body;

    let query = 'UPDATE users SET username = $1, full_name = $2, email = $3';
    const params = [username, full_name, email];
    let paramIndex = 4;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = $${paramIndex}`;
      params.push(hashedPassword);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} AND role = $${paramIndex + 1}`;
    params.push(id, 'teacher');

    const result = await db.query(query, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ message: 'Teacher updated successfully' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Update teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete teacher
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM users WHERE id = $1 AND role = $2', [id, 'teacher']);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all classes
const getAllClasses = async (req, res) => {
  try {
    const school_id = req.user.school_id;
    const result = await db.query(`
      SELECT c.*, u.full_name as teacher_name, u.username as teacher_username,
             COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN students s ON c.id = s.class_id
      WHERE c.school_id = $1
      GROUP BY c.id, u.full_name, u.username
      ORDER BY c.academic_year DESC, c.standard, c.section
    `, [school_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add class
const addClass = async (req, res) => {
  try {
    const { standard, section, academic_year, teacher_id } = req.body;
    const school_id = req.user.school_id;

    if (!standard || !section || !academic_year) {
      return res.status(400).json({ error: 'Standard, section, and academic year are required' });
    }

    const result = await db.query(
      'INSERT INTO classes (school_id, standard, section, academic_year, teacher_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [school_id, standard, section, academic_year, teacher_id || null]
    );

    res.status(201).json({ message: 'Class added successfully', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      if (error.message.includes('teacher_id')) {
        return res.status(400).json({ error: 'This teacher is already assigned to another class' });
      }
      return res.status(400).json({ error: 'Class already exists for this academic year' });
    }
    console.error('Add class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update class
const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { standard, section, academic_year, teacher_id } = req.body;

    const result = await db.query(
      'UPDATE classes SET standard = $1, section = $2, academic_year = $3, teacher_id = $4 WHERE id = $5',
      [standard, section, academic_year, teacher_id || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class updated successfully' });
  } catch (error) {
    if (error.code === '23505') {
      if (error.message.includes('teacher_id')) {
        return res.status(400).json({ error: 'This teacher is already assigned to another class' });
      }
      return res.status(400).json({ error: 'Class already exists for this academic year' });
    }
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete class
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM classes WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all holidays
const getAllHolidays = async (req, res) => {
  try {
    const { academic_year } = req.query;
    const school_id = req.user.school_id;
    let query = 'SELECT * FROM holidays WHERE school_id = $1';
    const params = [school_id];

    if (academic_year) {
      query += ' AND academic_year = $2';
      params.push(academic_year);
    }

    query += ' ORDER BY holiday_date';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add holiday
const addHoliday = async (req, res) => {
  try {
    const { holiday_date, description, academic_year } = req.body;
    const school_id = req.user.school_id;

    if (!holiday_date || !description || !academic_year) {
      return res.status(400).json({ error: 'Date, description, and academic year are required' });
    }

    const result = await db.query(
      'INSERT INTO holidays (school_id, holiday_date, description, academic_year) VALUES ($1, $2, $3, $4) RETURNING id',
      [school_id, holiday_date, description, academic_year]
    );

    res.status(201).json({ message: 'Holiday added successfully', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Holiday already exists for this date and year' });
    }
    console.error('Add holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete holiday
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM holidays WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Edit past attendance (admin only, up to 1 month)
const editPastAttendance = async (req, res) => {
  try {
    const { student_id, attendance_date, status } = req.body;

    if (!student_id || !attendance_date || !status) {
      return res.status(400).json({ error: 'Student ID, date, and status are required' });
    }

    // Check if date is within last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const attendanceDate = new Date(attendance_date);

    if (attendanceDate < oneMonthAgo) {
      return res.status(400).json({ error: 'Cannot edit attendance older than 1 month' });
    }

    if (attendanceDate > new Date()) {
      return res.status(400).json({ error: 'Cannot edit future attendance' });
    }

    // Check if record exists
    const existing = await db.query(
      'SELECT id FROM attendance_records WHERE student_id = $1 AND attendance_date = $2',
      [student_id, attendance_date]
    );

    if (existing.rows.length > 0) {
      // Update existing record
      await db.query(
        'UPDATE attendance_records SET status = $1, marked_by = $2 WHERE student_id = $3 AND attendance_date = $4',
        [status, req.user.id, student_id, attendance_date]
      );
    } else {
      // Create new record
      await db.query(
        'INSERT INTO attendance_records (student_id, attendance_date, status, marked_by) VALUES ($1, $2, $3, $4)',
        [student_id, attendance_date, status, req.user.id]
      );
    }

    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    console.error('Edit attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Promote students to next academic year
const promoteStudents = async (req, res) => {
  try {
    const { student_ids, current_class_id } = req.body;
    const school_id = req.user.school_id;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'Student IDs are required' });
    }

    if (!current_class_id) {
      return res.status(400).json({ error: 'Current class ID is required' });
    }

    // Get current class details
    const currentClassResult = await db.query(
      'SELECT standard, section, academic_year FROM classes WHERE id = $1 AND school_id = $2',
      [current_class_id, school_id]
    );

    if (!currentClassResult || currentClassResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const currentClass = currentClassResult.rows[0];
    const currentStandard = parseInt(currentClass.standard);
    const currentSection = currentClass.section;
    const currentAcademicYear = currentClass.academic_year;
    
    // Calculate next standard and academic year
    const nextStandard = currentStandard + 1;
    const yearParts = currentAcademicYear.split('-');
    if (yearParts.length !== 2) {
      return res.status(400).json({ error: 'Invalid academic year format' });
    }
    const startYear = parseInt(yearParts[0]);
    const nextAcademicYear = `${startYear + 1}-${startYear + 2}`;

    // Check if students have reached grade 12 (graduation)
    if (currentStandard >= 12) {
      return res.status(400).json({ error: 'Students in grade 12 cannot be promoted further. They have graduated.' });
    }

    // Find or create the target class (next standard, same section, next academic year)
    let targetClassResult = await db.query(
      'SELECT id FROM classes WHERE standard = $1 AND section = $2 AND academic_year = $3 AND school_id = $4',
      [nextStandard, currentSection, nextAcademicYear, school_id]
    );

    let targetClassId;
    if (targetClassResult.rows.length === 0) {
      // Create the new class
      const insertResult = await db.query(
        'INSERT INTO classes (standard, section, academic_year, school_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [nextStandard, currentSection, nextAcademicYear, school_id]
      );
      targetClassId = insertResult.rows[0].id;
    } else {
      targetClassId = targetClassResult.rows[0].id;
    }

    // Verify all students belong to this school and current class
    const students = await db.query(
      `SELECT s.id FROM students s 
       JOIN classes c ON s.class_id = c.id 
       WHERE s.id = ANY($1) AND c.school_id = $2 AND s.class_id = $3`,
      [student_ids, school_id, current_class_id]
    );

    if (students.rows.length !== student_ids.length) {
      return res.status(403).json({ error: 'Some students do not belong to the selected class' });
    }

    // Update class and academic year for selected students
    await db.query(
      'UPDATE students SET class_id = $1, academic_year = $2 WHERE id = ANY($3)',
      [targetClassId, nextAcademicYear, student_ids]
    );

    res.json({ 
      message: `Successfully promoted ${student_ids.length} student(s) from ${currentStandard}${currentSection} to ${nextStandard}${currentSection} (${nextAcademicYear})`,
      count: student_ids.length,
      from_class: `${currentStandard}${currentSection}`,
      to_class: `${nextStandard}${currentSection}`,
      academic_year: nextAcademicYear
    });
  } catch (error) {
    console.error('Promote students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
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
};
