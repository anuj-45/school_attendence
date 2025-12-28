const db = require('../config/db');
const { sendAbsentNotification } = require('../services/messagingService');

// Get absent students for a specific date
const getAbsentStudents = async (req, res) => {
  try {
    const { date, class_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;
    const schoolId = req.user.school_id;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    let query = `
      SELECT 
        s.id, s.name, s.roll_number, s.parent_email, s.parent_contact,
        c.standard, c.section, ar.status, ar.attendance_date,
        COALESCE(ml.id, 0) as message_sent
      FROM students s
      JOIN classes c ON s.class_id = c.id
      LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date = $1
      LEFT JOIN message_logs ml ON s.id = ml.student_id AND ml.attendance_date = $2
      WHERE ar.status = 'absent' AND c.school_id = $3
    `;

    const params = [date, date, schoolId];
    let paramIndex = 4;

    // If teacher, only show their class students
    if (userRole === 'teacher') {
      query += ` AND c.teacher_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (class_id) {
      query += ` AND c.id = $${paramIndex}`;
      params.push(class_id);
      paramIndex++;
    }

    query += ` ORDER BY s.roll_number`;

    const result = await db.query(query, params);

    res.json({
      date,
      count: result.rows.length,
      students: result.rows
    });
  } catch (error) {
    console.error('Get absent students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Send notifications to selected students' parents
const sendNotifications = async (req, res) => {
  try {
    const { student_ids, date } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'Student IDs are required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Get school name and ID for the logged-in user
    const userSchoolResult = await db.query(
      'SELECT s.id, s.school_name FROM schools s JOIN users u ON s.id = u.school_id WHERE u.id = $1',
      [userId]
    );
    const schoolName = userSchoolResult.rows[0]?.school_name || 'School Administration';
    const schoolId = userSchoolResult.rows[0]?.id;

    // Get students with their parent email addresses
    let query = `
      SELECT s.id, s.name, s.parent_email, c.teacher_id, c.school_id
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ANY($1)
    `;

    const studentsResult = await db.query(query, [student_ids]);
    const students = studentsResult.rows;

    // Security check: Verify all students belong to the user's school
    const unauthorizedBySchool = students.find(s => s.school_id !== schoolId);
    if (unauthorizedBySchool) {
      return res.status(403).json({ error: 'You can only send messages to students in your school' });
    }

    // Authorization check: teachers can only send to their class students
    if (userRole === 'teacher') {
      const unauthorizedStudent = students.find(s => s.teacher_id !== userId);
      if (unauthorizedStudent) {
        return res.status(403).json({ error: 'You can only send messages to students in your class' });
      }
    }

    const results = {
      total: students.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send email notifications to each student's parent
    for (const student of students) {
      if (!student.parent_email) {
        results.failed++;
        results.errors.push({
          student_id: student.id,
          student_name: student.name,
          error: 'No parent email address provided'
        });
        continue;
      }

      try {
        const result = await sendAbsentNotification(
          student.id,
          student.name,
          student.parent_email,
          date,
          schoolName,
          userId,
          schoolId
        );

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({
            student_id: student.id,
            student_name: student.name,
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          student_id: student.id,
          student_name: student.name,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Sent ${results.sent} out of ${results.total} notifications`,
      results
    });
  } catch (error) {
    console.error('Send notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get message history
const getMessageHistory = async (req, res) => {
  try {
    const { start_date, end_date, student_id, status } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        ml.id, ml.student_id, ml.recipient, ml.subject, ml.status,
        ml.attendance_date, ml.sent_at, ml.error_message,
        s.name as student_name, s.roll_number,
        c.standard, c.section,
        u.full_name as sent_by_name
      FROM message_logs ml
      JOIN students s ON ml.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN users u ON ml.sent_by = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // If teacher, only show messages they sent or for their class
    if (userRole === 'teacher') {
      query += ` AND (ml.sent_by = $${paramIndex} OR c.teacher_id = $${paramIndex + 1})`;
      params.push(userId, userId);
      paramIndex += 2;
    }

    if (start_date) {
      query += ` AND ml.attendance_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND ml.attendance_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (student_id) {
      query += ` AND ml.student_id = $${paramIndex}`;
      params.push(student_id);
      paramIndex++;
    }

    if (status) {
      query += ` AND ml.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY ml.sent_at DESC LIMIT 100`;

    const result = await db.query(query, params);

    res.json({
      count: result.rows.length,
      messages: result.rows
    });
  } catch (error) {
    console.error('Get message history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAbsentStudents,
  sendNotifications,
  getMessageHistory
};
