-- Revert messaging system to email only and make email compulsory
USE school_attendance;

-- Make parent_email NOT NULL (compulsory)
-- First update any NULL values to a placeholder
UPDATE students SET parent_email = 'noemail@placeholder.com' WHERE parent_email IS NULL OR parent_email = '';

-- Now alter the column to make it NOT NULL
ALTER TABLE students 
MODIFY COLUMN parent_email VARCHAR(150) NOT NULL;

-- Update message_logs table to support only email
-- First, convert existing WhatsApp logs to email type
UPDATE message_logs SET message_type = 'email' WHERE message_type != 'email';

-- Now modify the column to only support email
ALTER TABLE message_logs 
MODIFY COLUMN message_type ENUM('email') NOT NULL DEFAULT 'email';
