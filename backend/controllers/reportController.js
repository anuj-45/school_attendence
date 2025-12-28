const db = require('../config/db');

// Calculate attendance for a student
const getStudentAttendance = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { start_date, end_date, academic_year } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get student info
    const studentsResult = await db.query(
      'SELECT s.*, c.standard, c.section FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = $1',
      [student_id]
    );

    if (studentsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentsResult.rows[0];

    // Get attendance records
    const recordsResult = await db.query(
      'SELECT status, COUNT(*) as count FROM attendance_records WHERE student_id = $1 AND attendance_date BETWEEN $2 AND $3 GROUP BY status',
      [student_id, start_date, end_date]
    );

    const records = recordsResult.rows;

    // Get holidays count
    const yearToUse = academic_year || student.academic_year;
    const holidaysResult = await db.query(
      'SELECT COUNT(*) as count FROM holidays WHERE academic_year = $1 AND holiday_date BETWEEN $2 AND $3',
      [yearToUse, start_date, end_date]
    );

    const holidayCount = parseInt(holidaysResult.rows[0].count);

    // Calculate total days
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const totalSchoolDays = totalDays - holidayCount;

    // Calculate attendance statistics
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    records.forEach(record => {
      if (record.status === 'present') presentCount = record.count;
      else if (record.status === 'late') lateCount = record.count;
      else if (record.status === 'absent') absentCount = record.count;
    });

    const totalMarkedDays = presentCount + lateCount + absentCount;
    const unmarkedDays = totalSchoolDays - totalMarkedDays;
    
    // Unmarked days are considered present
    const totalPresentDays = presentCount + lateCount + unmarkedDays;
    const attendancePercentage = totalSchoolDays > 0 ? ((totalPresentDays / totalSchoolDays) * 100).toFixed(2) : 0;
    const latePercentage = totalSchoolDays > 0 ? ((lateCount / totalSchoolDays) * 100).toFixed(2) : 0;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        roll_number: student.roll_number,
        standard: student.standard,
        section: student.section
      },
      period: {
        start_date,
        end_date,
        total_days: totalDays,
        holidays: holidayCount,
        total_school_days: totalSchoolDays
      },
      attendance: {
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        unmarked: unmarkedDays,
        total_present: totalPresentDays,
        attendance_percentage: parseFloat(attendancePercentage),
        late_percentage: parseFloat(latePercentage)
      }
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get monthly attendance report for a class
const getClassMonthlyReport = async (req, res) => {
  try {
    const { class_id, month, year } = req.query;

    if (!class_id || !month || !year) {
      return res.status(400).json({ error: 'Class ID, month, and year are required' });
    }

    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all students in class
    const studentsResult = await db.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY roll_number',
      [class_id]
    );

    const students = studentsResult.rows;

    // Get class info
    const classesResult = await db.query(
      'SELECT * FROM classes WHERE id = $1',
      [class_id]
    );

    if (classesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const classInfo = classesResult.rows[0];

    // Get holidays
    const holidaysResult = await db.query(
      'SELECT COUNT(*) as count FROM holidays WHERE academic_year = $1 AND holiday_date BETWEEN $2 AND $3',
      [classInfo.academic_year, startDateStr, endDateStr]
    );

    const holidayCount = parseInt(holidaysResult.rows[0].count);
    const totalDays = endDate.getDate();
    const totalSchoolDays = totalDays - holidayCount;

    // Get attendance for all students
    const report = [];
    for (const student of students) {
      const recordsResult = await db.query(
        'SELECT status, COUNT(*) as count FROM attendance_records WHERE student_id = $1 AND attendance_date BETWEEN $2 AND $3 GROUP BY status',
        [student.id, startDateStr, endDateStr]
      );

      const records = recordsResult.rows;

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      records.forEach(record => {
        if (record.status === 'present') presentCount = record.count;
        else if (record.status === 'late') lateCount = record.count;
        else if (record.status === 'absent') absentCount = record.count;
      });

      const totalMarkedDays = presentCount + lateCount + absentCount;
      const unmarkedDays = totalSchoolDays - totalMarkedDays;
      const totalPresentDays = presentCount + lateCount + unmarkedDays;
      const attendancePercentage = totalSchoolDays > 0 ? ((totalPresentDays / totalSchoolDays) * 100).toFixed(2) : 0;
      const latePercentage = totalSchoolDays > 0 ? ((lateCount / totalSchoolDays) * 100).toFixed(2) : 0;

      report.push({
        student_id: student.id,
        name: student.name,
        roll_number: student.roll_number,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        total_present: totalPresentDays,
        attendance_percentage: parseFloat(attendancePercentage),
        late_percentage: parseFloat(latePercentage)
      });
    }

    res.json({
      class: {
        id: classInfo.id,
        standard: classInfo.standard,
        section: classInfo.section,
        academic_year: classInfo.academic_year
      },
      period: {
        month,
        year,
        total_days: totalDays,
        holidays: holidayCount,
        total_school_days: totalSchoolDays
      },
      students: report
    });
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get yearly attendance report for a student
const getStudentYearlyReport = async (req, res) => {
  try {
    const { student_id, academic_year } = req.query;

    console.log('Yearly report request:', { student_id, academic_year });

    if (!student_id || !academic_year) {
      return res.status(400).json({ error: 'Student ID and academic year are required' });
    }

    // Parse academic year (e.g., "2023-2024")
    const [startYear, endYear] = academic_year.split('-');
    const startDate = `${startYear}-04-01`; // Assuming April to March academic year
    const endDate = `${endYear}-03-31`;

    console.log('Date range:', { startDate, endDate });

    // Get student info
    const studentsResult = await db.query(
      'SELECT s.*, c.standard, c.section FROM students s JOIN classes c ON s.class_id = c.id WHERE s.id = $1',
      [student_id]
    );

    if (studentsResult.rows.length === 0) {
      console.log('Student not found:', student_id);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log('Student found:', studentsResult.rows[0].name);

    const student = studentsResult.rows[0];

    // Get monthly breakdown
    const monthlyData = [];
    const currentDate = new Date();
    
    for (let month = 4; month <= 15; month++) {
      const actualMonth = month > 12 ? month - 12 : month;
      const year = month > 12 ? parseInt(endYear) : parseInt(startYear);
      
      const monthStart = new Date(year, actualMonth - 1, 1);
      const monthEnd = new Date(year, actualMonth, 0);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Skip future months
      if (monthStart > currentDate) {
        continue;
      }

      const recordsResult = await db.query(
        'SELECT status, COUNT(*) as count FROM attendance_records WHERE student_id = $1 AND attendance_date BETWEEN $2 AND $3 GROUP BY status',
        [student_id, monthStartStr, monthEndStr]
      );

      const records = recordsResult.rows;

      const holidaysResult = await db.query(
        'SELECT COUNT(*) as count FROM holidays WHERE academic_year = $1 AND holiday_date BETWEEN $2 AND $3',
        [academic_year, monthStartStr, monthEndStr]
      );

      const holidayCount = parseInt(holidaysResult.rows[0].count);
      const totalDays = monthEnd.getDate();
      const totalSchoolDays = totalDays - holidayCount;

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      records.forEach(record => {
        if (record.status === 'present') presentCount = record.count;
        else if (record.status === 'late') lateCount = record.count;
        else if (record.status === 'absent') absentCount = record.count;
      });

      const totalMarkedDays = presentCount + lateCount + absentCount;
      const unmarkedDays = totalSchoolDays - totalMarkedDays;
      const totalPresentDays = presentCount + lateCount + unmarkedDays;
      const attendancePercentage = totalSchoolDays > 0 ? ((totalPresentDays / totalSchoolDays) * 100).toFixed(2) : 0;

      monthlyData.push({
        month: actualMonth,
        year: year,
        month_name: new Date(year, actualMonth - 1).toLocaleString('default', { month: 'long' }),
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        total_present: totalPresentDays,
        total_school_days: totalSchoolDays,
        attendance_percentage: parseFloat(attendancePercentage)
      });
    }

    // Calculate overall yearly statistics
    const yearlyTotals = monthlyData.reduce((acc, month) => ({
      present: acc.present + month.present,
      late: acc.late + month.late,
      absent: acc.absent + month.absent,
      total_present: acc.total_present + month.total_present,
      total_school_days: acc.total_school_days + month.total_school_days
    }), { present: 0, late: 0, absent: 0, total_present: 0, total_school_days: 0 });

    const yearlyAttendancePercentage = yearlyTotals.total_school_days > 0 
      ? ((yearlyTotals.total_present / yearlyTotals.total_school_days) * 100).toFixed(2) 
      : 0;
    const yearlyLatePercentage = yearlyTotals.total_school_days > 0 
      ? ((yearlyTotals.late / yearlyTotals.total_school_days) * 100).toFixed(2) 
      : 0;

    const responseData = {
      student: {
        id: student.id,
        name: student.name,
        roll_number: student.roll_number,
        standard: student.standard,
        section: student.section
      },
      academic_year,
      yearly_summary: {
        present: yearlyTotals.present,
        late: yearlyTotals.late,
        absent: yearlyTotals.absent,
        total_present: yearlyTotals.total_present,
        total_school_days: yearlyTotals.total_school_days,
        attendance_percentage: parseFloat(yearlyAttendancePercentage),
        late_percentage: parseFloat(yearlyLatePercentage)
      },
      monthly_breakdown: monthlyData
    };

    console.log('Sending yearly report with', monthlyData.length, 'months of data');
    res.json(responseData);
  } catch (error) {
    console.error('Get yearly report error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Get daily attendance report for a class with gender breakdown
const getDailyAttendance = async (req, res) => {
  try {
    const { class_id, date } = req.query;

    if (!class_id || !date) {
      return res.status(400).json({ error: 'Class ID and date are required' });
    }

    // Get class info
    const classesResult = await db.query(
      'SELECT * FROM classes WHERE id = $1',
      [class_id]
    );

    if (classesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const classInfo = classesResult.rows[0];

    // Get all students in the class with their attendance for the date
    const studentsResult = await db.query(
      `SELECT s.id, s.roll_number, s.name, s.gender,
        COALESCE(ar.status, 'unmarked') as status
       FROM students s
       LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.attendance_date = $1
       WHERE s.class_id = $2
       ORDER BY s.roll_number`,
      [date, class_id]
    );

    const students = studentsResult.rows;

    // Calculate overall statistics
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalUnmarked = 0;

    // Calculate gender-wise statistics
    let malePresent = 0;
    let maleAbsent = 0;
    let maleLate = 0;
    let maleUnmarked = 0;
    let maleTotal = 0;

    let femalePresent = 0;
    let femaleAbsent = 0;
    let femaleLate = 0;
    let femaleUnmarked = 0;
    let femaleTotal = 0;

    students.forEach(student => {
      const isMale = student.gender === 'male';
      const isFemale = student.gender === 'female';

      if (isMale) maleTotal++;
      if (isFemale) femaleTotal++;

      switch(student.status) {
        case 'present':
          totalPresent++;
          if (isMale) malePresent++;
          if (isFemale) femalePresent++;
          break;
        case 'absent':
          totalAbsent++;
          if (isMale) maleAbsent++;
          if (isFemale) femaleAbsent++;
          break;
        case 'late':
          totalLate++;
          if (isMale) maleLate++;
          if (isFemale) femaleLate++;
          break;
        case 'unmarked':
          totalUnmarked++;
          if (isMale) maleUnmarked++;
          if (isFemale) femaleUnmarked++;
          break;
      }
    });

    const totalStudents = students.length;
    const totalMarked = totalPresent + totalAbsent + totalLate;
    
    // Calculate percentages (late is counted as present for percentage)
    const totalPresentIncludingLate = totalPresent + totalLate;
    const attendancePercentage = totalStudents > 0 ? ((totalPresentIncludingLate / totalStudents) * 100).toFixed(2) : 0;
    
    const malePresentIncludingLate = malePresent + maleLate;
    const maleAttendancePercentage = maleTotal > 0 ? ((malePresentIncludingLate / maleTotal) * 100).toFixed(2) : 0;
    
    const femalePresentIncludingLate = femalePresent + femaleLate;
    const femaleAttendancePercentage = femaleTotal > 0 ? ((femalePresentIncludingLate / femaleTotal) * 100).toFixed(2) : 0;

    res.json({
      class: {
        id: classInfo.id,
        standard: classInfo.standard,
        section: classInfo.section,
        academic_year: classInfo.academic_year
      },
      date,
      statistics: {
        total_students: totalStudents,
        total_marked: totalMarked,
        total_unmarked: totalUnmarked,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        present_including_late: totalPresentIncludingLate,
        attendance_percentage: parseFloat(attendancePercentage)
      },
      gender_breakdown: {
        male: {
          total: maleTotal,
          present: malePresent,
          absent: maleAbsent,
          late: maleLate,
          unmarked: maleUnmarked,
          present_including_late: malePresentIncludingLate,
          attendance_percentage: parseFloat(maleAttendancePercentage)
        },
        female: {
          total: femaleTotal,
          present: femalePresent,
          absent: femaleAbsent,
          late: femaleLate,
          unmarked: femaleUnmarked,
          present_including_late: femalePresentIncludingLate,
          attendance_percentage: parseFloat(femaleAttendancePercentage)
        }
      },
      students
    });
  } catch (error) {
    console.error('Get daily attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get yearly attendance for all students in a class (for promotion)
const getClassYearlyReport = async (req, res) => {
  try {
    const { class_id, academic_year } = req.query;

    if (!class_id || !academic_year) {
      return res.status(400).json({ error: 'Class ID and academic year are required' });
    }

    // Get all students in the class
    const studentsResult = await db.query(
      `SELECT s.id as student_id, s.roll_number, s.name, c.standard, c.section, c.school_id
       FROM students s
       JOIN classes c ON s.class_id = c.id
       WHERE s.class_id = $1 AND s.academic_year = $2
       ORDER BY s.roll_number`,
      [class_id, academic_year]
    );

    const students = studentsResult.rows;

    if (students.length === 0) {
      return res.json({ students: [] });
    }

    const school_id = students[0].school_id;

    // Get date range for the academic year
    const [startYear] = academic_year.split('-').map(Number);
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;

    // Get holidays count
    const holidaysResult = await db.query(
      'SELECT COUNT(*) as count FROM holidays WHERE school_id = $1 AND academic_year = $2 AND holiday_date BETWEEN $3 AND $4',
      [school_id, academic_year, startDate, endDate]
    );
    const holidayCount = parseInt(holidaysResult.rows[0].count);

    // Calculate total school days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const totalSchoolDays = totalDays - holidayCount;

    // Get attendance for all students
    const studentIds = students.map(s => s.student_id);
    const attendanceRecordsResult = await db.query(
      `SELECT student_id, status, COUNT(*) as count
       FROM attendance_records
       WHERE student_id = ANY($1) AND attendance_date BETWEEN $2 AND $3
       GROUP BY student_id, status`,
      [studentIds, startDate, endDate]
    );

    const attendanceRecords = attendanceRecordsResult.rows;

    // Process attendance data for each student
    const studentsWithAttendance = students.map(student => {
      const studentRecords = attendanceRecords.filter(r => r.student_id === student.student_id);
      
      let present = 0, late = 0, absent = 0;
      studentRecords.forEach(record => {
        if (record.status === 'present') present = record.count;
        if (record.status === 'late') late = record.count;
        if (record.status === 'absent') absent = record.count;
      });

      const totalPresent = present + late;
      const attendancePercentage = totalSchoolDays > 0 
        ? ((totalPresent / totalSchoolDays) * 100).toFixed(2)
        : '0.00';

      return {
        ...student,
        present,
        late,
        absent,
        total_present: totalPresent,
        total_school_days: totalSchoolDays,
        attendance_percentage: parseFloat(attendancePercentage)
      };
    });

    res.json({ students: studentsWithAttendance });
  } catch (error) {
    console.error('Get class yearly report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getStudentAttendance,
  getClassMonthlyReport,
  getStudentYearlyReport,
  getDailyAttendance,
  getClassYearlyReport
};
