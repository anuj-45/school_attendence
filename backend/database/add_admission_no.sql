-- Add admission_no column to students table
USE school_attendance;

ALTER TABLE students
ADD COLUMN admission_no VARCHAR(50) AFTER roll_number;
