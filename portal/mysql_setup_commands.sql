-- MySQL Setup Commands for Campus Event Management Platform
-- Run these commands in your MySQL client to ensure compatibility

-- Create the database
CREATE DATABASE IF NOT EXISTS portal;
USE portal;

-- Ensure MySQL 8+ compatibility with authentication
-- (Optional: Only if you encounter authentication issues)
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '1111';
-- FLUSH PRIVILEGES;

-- Verify the setup
SELECT 'Database setup complete!' as status;
SHOW DATABASES LIKE 'portal';

-- The application will automatically create tables when you run:
-- python run.py


