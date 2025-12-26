-- Migration script to add school support to existing database
USE school_attendance;

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_name VARCHAR(300) NOT NULL,
    udise_code VARCHAR(50) UNIQUE NOT NULL,
    principal VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_udise (udise_code)
);

-- Add school_id to users table
ALTER TABLE users 
ADD COLUMN school_id INT AFTER id,
ADD INDEX idx_school (school_id),
DROP INDEX username,
ADD UNIQUE KEY unique_username_school (username, school_id);

-- Add school_id to classes table
ALTER TABLE classes
ADD COLUMN school_id INT AFTER id,
ADD INDEX idx_school (school_id),
DROP INDEX unique_class,
ADD UNIQUE KEY unique_class (school_id, standard, section, academic_year);

-- Add school_id to holidays table
ALTER TABLE holidays
ADD COLUMN school_id INT AFTER id,
ADD INDEX idx_school (school_id),
DROP INDEX unique_holiday,
ADD UNIQUE KEY unique_holiday (school_id, holiday_date, academic_year);

-- Add foreign keys
ALTER TABLE users
ADD FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE classes
ADD FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE holidays
ADD FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Note: Existing data will have NULL school_id values
-- You need to either:
-- 1. Delete existing data
-- 2. Or create a default school and update all records
