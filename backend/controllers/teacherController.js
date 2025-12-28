const db = require('../config/db');

// Get teacher's assigned class
const getMyClass = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM classes WHERE teacher_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get students in teacher's class
const getMyStudents = async (req, res) => {
  try {
    const classResult = await db.query(
      'SELECT id FROM classes WHERE teacher_id = $1',
      [req.user.id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    const classId = classResult.rows[0].id;

    const studentsResult = await db.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY roll_number',
      [classId]
    );

    res.json(studentsResult.rows);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get attendance for a specific date
const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;

    const classResult = await db.query(
      'SELECT id FROM classes WHERE teacher_id = $1',
      [req.user.id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    const classId = classResult.rows[0].id;

    const attendanceResult = await db.query(`
      SELECT s.id as student_id, s.name, s.roll_number, 
             COALESCE(ar.status, 'present') as status
      FROM students s
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date = $1
      WHERE s.class_id = $2
      ORDER BY s.roll_number
    `, [date, classId]);

    res.json(attendanceResult.rows);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark attendance for current date only
const markAttendance = async (req, res) => {
  const client = await db.connect();
  
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
    const classResult = await client.query(
      'SELECT id FROM classes WHERE teacher_id = $1',
      [req.user.id]
    );

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'No class assigned to you' });
    }

    const classId = classResult.rows[0].id;

    // Begin transaction
    await client.query('BEGIN');

    try {
      // Delete existing attendance for this date
      await client.query(
        'DELETE FROM attendance_records WHERE student_id IN (SELECT id FROM students WHERE class_id = $1) AND attendance_date = $2',
        [classId, attendance_date]
      );

      // Insert new attendance records
      for (const record of attendance_records) {
        const { student_id, status } = record;

        // Verify student belongs to teacher's class
        const studentResult = await client.query(
          'SELECT id FROM students WHERE id = $1 AND class_id = $2',
          [student_id, classId]
        );

        if (studentResult.rows.length === 0) {
          throw new Error(`Student ${student_id} not found in your class`);
        }

        await client.query(
          'INSERT INTO attendance_records (student_id, attendance_date, status, marked_by) VALUES ($1, $2, $3, $4)',
          [student_id, attendance_date, status, req.user.id]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Attendance marked successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getMyClass,
  getMyStudents,
  getAttendanceByDate,
  markAttendance
};
