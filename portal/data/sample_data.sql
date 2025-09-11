-- Sample data for Campus Event Management Platform
-- This file contains sample queries for testing the system

-- Sample colleges
INSERT IGNORE INTO colleges (name, location, contact_email) VALUES 
('BRP College of Engineering', 'Latur', 'contact@brp.edu'),
('VTU University', 'Vellore', 'info@vtu.ac.in'),
('mvjce', 'banglore', 'contact@mvjce.ac.in');

-- Sample students
INSERT IGNORE INTO students (name, email, college_id, student_id, phone) VALUES 
('Alice Johnson', 'alice@student.com', 1, 'CS001', '9876543210'),
('Bob Smith', 'bob@student.com', 1, 'CS002', '9876543211'),
('Charlie Brown', 'charlie@student.com', 2, 'CS003', '9876543212'),
('Diana Prince', 'diana@student.com', 2, 'CS004', '9876543213'),
('Eve Wilson', 'eve@student.com', 3, 'CS005', '9876543214'),
('Frank Miller', 'frank@student.com', 1, 'CS006', '9876543215'),
('Grace Lee', 'grace@student.com', 2, 'CS007', '9876543216'),
('Henry Ford', 'henry@student.com', 3, 'CS008', '9876543217');

-- Sample events (Note: Replace with current timestamps in actual usage)
INSERT IGNORE INTO events (id, title, description, event_type, college_id, created_by, start_datetime, end_datetime, location, max_capacity) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'AI/ML Workshop', 'Learn machine learning basics', 'workshop', 1, 'staff@mitcoe.edu', '2025-09-17 10:00:00', '2025-09-17 14:00:00', 'Lab 101', 50),
('550e8400-e29b-41d4-a716-446655440002', 'Hackathon 2025', '24-hour coding challenge', 'hackathon', 1, 'staff@mitcoe.edu', '2025-09-24 09:00:00', '2025-09-25 09:00:00', 'Main Hall', 100),
('550e8400-e29b-41d4-a716-446655440003', 'Tech Talk: Blockchain', 'Understanding blockchain technology', 'tech_talk', 2, 'prof@vit.ac.in', '2025-10-01 15:00:00', '2025-10-01 17:00:00', 'Auditorium', 200),
('550e8400-e29b-41d4-a716-446655440004', 'Web Development Fest', 'Full stack development competition', 'fest', 3, 'admin@iitb.ac.in', '2025-10-08 10:00:00', '2025-10-08 18:00:00', 'Computer Lab', 75);

-- Sample registrations
INSERT IGNORE INTO registrations (event_id, student_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 1),
('550e8400-e29b-41d4-a716-446655440001', 2),
('550e8400-e29b-41d4-a716-446655440001', 6),
('550e8400-e29b-41d4-a716-446655440002', 1),
('550e8400-e29b-41d4-a716-446655440002', 2),
('550e8400-e29b-41d4-a716-446655440002', 6),
('550e8400-e29b-41d4-a716-446655440003', 3),
('550e8400-e29b-41d4-a716-446655440003', 4),
('550e8400-e29b-41d4-a716-446655440003', 7),
('550e8400-e29b-41d4-a716-446655440004', 5),
('550e8400-e29b-41d4-a716-446655440004', 8);

-- Sample attendance (some students attended)
INSERT IGNORE INTO attendance (registration_id) VALUES 
(1), -- Alice attended AI/ML Workshop
(2), -- Bob attended AI/ML Workshop  
(4), -- Alice attended Hackathon
(7), -- Charlie attended Tech Talk
(8), -- Diana attended Tech Talk
(10), -- Eve attended Web Dev Fest
(11); -- Henry attended Web Dev Fest

-- Sample feedback
INSERT IGNORE INTO feedback (registration_id, rating, comments) VALUES 
(1, 5, 'Excellent workshop! Learned a lot about ML concepts.'),
(2, 4, 'Good content, but could use more hands-on exercises.'),
(4, 5, 'Amazing hackathon experience!'),
(7, 4, 'Very informative talk about blockchain.'),
(8, 3, 'Good but a bit too technical for beginners.'),
(10, 5, 'Perfect fest! Great organization.'),
(11, 4, 'Enjoyed the competition format.');

-- Useful queries for testing

-- Event popularity report
-- SELECT e.title, e.event_type, c.name as college_name, COUNT(r.id) as registrations
-- FROM events e
-- LEFT JOIN registrations r ON e.id = r.event_id
-- JOIN colleges c ON e.college_id = c.id
-- GROUP BY e.id
-- ORDER BY registrations DESC;

-- Student participation report  
-- SELECT s.name, s.email, c.name as college_name, COUNT(a.id) as events_attended
-- FROM students s
-- LEFT JOIN registrations r ON s.id = r.student_id
-- LEFT JOIN attendance a ON r.id = a.registration_id
-- JOIN colleges c ON s.college_id = c.id
-- GROUP BY s.id
-- ORDER BY events_attended DESC;

-- Attendance percentage per event
-- SELECT e.title, 
--        COUNT(r.id) as total_registrations,
--        COUNT(a.id) as total_attendance,
--        ROUND(COUNT(a.id) * 100.0 / COUNT(r.id), 2) as attendance_percentage
-- FROM events e
-- LEFT JOIN registrations r ON e.id = r.event_id
-- LEFT JOIN attendance a ON r.id = a.registration_id
-- GROUP BY e.id;

-- Average feedback score per event
-- SELECT e.title, COUNT(f.id) as feedback_count, ROUND(AVG(f.rating), 2) as avg_rating
-- FROM events e
-- LEFT JOIN registrations r ON e.id = r.event_id
-- LEFT JOIN feedback f ON r.id = f.registration_id
-- GROUP BY e.id
-- HAVING feedback_count > 0
-- ORDER BY avg_rating DESC;





