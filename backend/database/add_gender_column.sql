-- Add gender column to students table
USE school_attendance;

-- Add gender column (set default temporarily to allow existing rows)
ALTER TABLE students 
ADD COLUMN gender ENUM('male', 'female') NULL AFTER academic_year;

-- Update existing students with a default value (you may want to update this manually)
-- UPDATE students SET gender = 'male' WHERE gender IS NULL;

-- After updating all existing records, you can make it NOT NULL
-- ALTER TABLE students MODIFY COLUMN gender ENUM('male', 'female') NOT NULL;

-- Add index on gender for better query performance
ALTER TABLE students ADD INDEX idx_gender (gender);
