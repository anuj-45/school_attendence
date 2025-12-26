const db = require('../config/db');

// Get teacher's assigned class
const getMyClass = async (req, res) => {
  try {
    const [classes] = await db.query(
      'SELECT * FROM classes WHERE teacher_id = ?',
      [req.user.id]
    );

    if (classes.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    res.json(classes[0]);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get students in teacher's class
const getMyStudents = async (req, res) => {
  try {
    const [classes] = await db.query(
      'SELECT id FROM classes WHERE teacher_id = ?',
      [req.user.id]
    );

    if (classes.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    const classId = classes[0].id;

    const [students] = await db.query(
      'SELECT * FROM students WHERE class_id = ? ORDER BY roll_number',
      [classId]
    );

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get attendance for a specific date
const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const [classes] = await db.query(
      'SELECT id FROM classes WHERE teacher_id = ?',
      [req.user.id]
    );

    if (classes.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    const classId = classes[0].id;

    const [attendance] = await db.query(`
      SELECT s.id as student_id, s.name, s.roll_number, 
             COALESCE(ar.status, 'present') as status
      FROM students s
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date = ?
      WHERE s.class_id = ?
      ORDER BY s.roll_number
    `, [date, classId]);

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark attendance for current date only
const markAttendance = async (req, res) => {
  try {
    const { attendance_date, attendance_records } = req.body;

    if (!attendance_date || !attendance_records || !Array.isArray(attendance_records)) {
      return res.status(400).json({ error: 'Date and attendance records are required' });
    }

    // Verify date is not in the past (teachers can only mark today's attendance)
    const today = new Date().toISOString().split('T')[0];
    if (attendance_date !== today) {
      return res.status(400).json({ error: 'You can only mark attendance for today' });
    }

    // Verify teacher's class
    const [classes] = await db.query(
      'SELECT id FROM classes WHERE teacher_id = ?',
      [req.user.id]
    );

    if (classes.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    const classId = classes[0].id;

    // Begin transaction
    await db.query('START TRANSACTION');

    try {
      // Delete existing attendance for this date
      await db.query(
        'DELETE FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE class_id = ?) AND attendance_date = ?',
        [classId, attendance_date]
      );

      // Insert new attendance records
      for (const record of attendance_records) {
        const { student_id, status } = record;

        // Verify student belongs to teacher's class
        const [students] = await db.query(
          'SELECT id FROM students WHERE id = ? AND class_id = ?',
          [student_id, classId]
        );

        if (students.length === 0) {
          throw new Error(`Student ${student_id} not found in your class`);
        }

        await db.query(
          'INSERT INTO attendance_records (student_id, attendance_date, status, marked_by) VALUES (?, ?, ?, ?)',
          [student_id, attendance_date, status, req.user.id]
        );
      }

      await db.query('COMMIT');
      res.json({ message: 'Attendance marked successfully' });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

module.exports = {
  getMyClass,
  getMyStudents,
  getAttendanceByDate,
  markAttendance
};
