-- Add columns for password reset functionality
ALTER TABLE users
ADD COLUMN passwordResetToken VARCHAR(255) DEFAULT NULL,
ADD COLUMN passwordResetExpiresAt DATETIME DEFAULT NULL;

-- Add index for faster token lookup
CREATE INDEX idx_password_reset_token ON users (passwordResetToken);