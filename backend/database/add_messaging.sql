-- Add parent email field to students table
USE school_attendance;

-- Add parent_email column to students table
ALTER TABLE students
ADD COLUMN parent_email VARCHAR(150) AFTER parent_contact;

-- Create message_logs table to track all sent messages
CREATE TABLE IF NOT EXISTS message_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    message_type ENUM('email') NOT NULL DEFAULT 'email',
    recipient VARCHAR(150) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
    sent_by INT NOT NULL,
    attendance_date DATE NOT NULL,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_date (attendance_date),
    INDEX idx_sent_by (sent_by),
    INDEX idx_status (status)
);
