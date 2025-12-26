const nodemailer = require('nodemailer');
const db = require('../config/db');

// Create email transporter with school-specific or default settings
const createTransporter = async (smtpEmail = null, smtpPassword = null) => {
  const nodemailer = require('nodemailer');
  
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: smtpEmail || process.env.SMTP_USER,
      pass: smtpPassword || process.env.SMTP_PASS
    }
  };

  return nodemailer.createTransport(config);
};

// Get school's email settings from database
const getSchoolEmailSettings = async (schoolId) => {
  try {
    const [schools] = await db.query(
      'SELECT school_name, smtp_email, smtp_password FROM schools WHERE id = ?',
      [schoolId]
    );
    
    if (schools.length > 0 && schools[0].smtp_email && schools[0].smtp_password) {
      return {
        schoolName: schools[0].school_name,
        smtpEmail: schools[0].smtp_email,
        smtpPassword: schools[0].smtp_password
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting school email settings:', error);
    return null;
  }
};

// Generate message template
const getMessageTemplate = (studentName, date, status, schoolName) => {
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const subject = `Attendance Alert: ${studentName} - ${formattedDate}`;
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
          .status { color: #d32f2f; font-weight: bold; text-transform: uppercase; }
          .footer { background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Attendance Alert</h2>
          </div>
          <div class="content">
            <p>Dear Parent,</p>
            <p>This is to inform you that <strong>${studentName}</strong> was marked as <span class="status">${status}</span> on <strong>${formattedDate}</strong>.</p>
            <p>If this is incorrect or if you have any concerns, please contact the school immediately.</p>
          </div>
          <div class="footer">
            <p>${schoolName || 'School Administration'}</p>
            <p><em>This is an automated message. Please do not reply to this email.</em></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Attendance Alert

Dear Parent,

${studentName} was marked as ${status.toUpperCase()} on ${formattedDate}.

If this is incorrect, please contact the school.

- ${schoolName || 'School Administration'}
  `.trim();

  return { subject, html, text };
};

// Log message to database
const logMessage = async (studentId, recipient, subject, content, status, sentBy, attendanceDate, messageType = 'email', errorMessage = null) => {
  try {
    const [result] = await db.query(
      `INSERT INTO message_logs 
       (student_id, message_type, recipient, subject, message_content, status, sent_by, attendance_date, error_message) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, messageType, recipient, subject, content, status, sentBy, attendanceDate, errorMessage]
    );
    return result.insertId;
  } catch (error) {
    console.error('Error logging message:', error);
    throw error;
  }
};

// Send email
const sendEmail = async (to, subject, html, text, smtpEmail = null, smtpPassword = null) => {
  try {
    const transporter = await createTransporter(smtpEmail, smtpPassword);
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'School System'} <${smtpEmail || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Main function to send absent notification via email
const sendAbsentNotification = async (studentId, studentName, parentEmail, date, schoolName, sentBy, schoolId = null) => {
  const template = getMessageTemplate(studentName, date, 'absent', schoolName);
  
  // Get school email settings if schoolId is provided
  let smtpEmail = null;
  let smtpPassword = null;
  
  if (schoolId) {
    const schoolSettings = await getSchoolEmailSettings(schoolId);
    if (schoolSettings) {
      smtpEmail = schoolSettings.smtpEmail;
      smtpPassword = schoolSettings.smtpPassword;
    }
  }
  
  const result = await sendEmail(parentEmail, template.subject, template.html, template.text, smtpEmail, smtpPassword);
  
  // Log the message
  await logMessage(
    studentId,
    parentEmail,
    template.subject,
    template.text,
    result.success ? 'sent' : 'failed',
    sentBy,
    date,
    'email',
    result.success ? null : result.error
  );

  return result;
};

module.exports = {
  sendEmail,
  sendAbsentNotification,
  getMessageTemplate,
  logMessage,
  createTransporter,
  getSchoolEmailSettings
};
