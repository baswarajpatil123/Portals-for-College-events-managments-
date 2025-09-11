"""
Data models and utility functions for Campus Event Management Platform
"""
import uuid
from datetime import datetime
from database import get_db_connection

class EventManager:
    """Handles event-related operations"""
    
    @staticmethod
    def create_event(title, description, event_type, college_id, created_by, 
                    start_datetime, end_datetime, location, max_capacity=0):
        """Create a new event with comprehensive validation"""
        from datetime import datetime
        
        # Input validation
        if not title or not title.strip():
            raise ValueError("Event title is required")
        
        if not event_type or event_type not in ['workshop', 'hackathon', 'tech_talk', 'fest', 'seminar']:
            raise ValueError("Invalid event type")
        
        if not college_id or college_id <= 0:
            raise ValueError("Valid college ID is required")
        
        if not created_by or not created_by.strip():
            raise ValueError("Created by field is required")
        
        # Date validation
        try:
            start_dt = datetime.strptime(start_datetime, '%Y-%m-%d %H:%M:%S')
            end_dt = datetime.strptime(end_datetime, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD HH:MM:SS")
        
        if end_dt <= start_dt:
            raise ValueError("End datetime must be after start datetime")
        
        if start_dt < datetime.now():
            raise ValueError("Event cannot be scheduled in the past")
        
        # Capacity validation
        if max_capacity < 0:
            raise ValueError("Max capacity cannot be negative")
        
        # Check if college exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM colleges WHERE id = %s', (college_id,))
        if not cursor.fetchone():
            conn.close()
            raise ValueError("College does not exist")
        
        event_id = str(uuid.uuid4())
        
        try:
            cursor.execute('''
                INSERT INTO events (id, title, description, event_type, college_id, created_by,
                                  start_datetime, end_datetime, location, max_capacity)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (event_id, title, description, event_type, college_id, created_by,
                  start_datetime, end_datetime, location, max_capacity))
            
            conn.commit()
            conn.close()
            return event_id
            
        except Exception as e:
            conn.rollback()
            conn.close()
            raise Exception(f"Failed to create event: {str(e)}")
    
    @staticmethod
    def get_events(college_id=None, event_type=None):
        """Get events with optional filtering"""
        conn = get_db_connection()
        cursor = conn.cursor()
        query = '''
            SELECT e.*, c.name as college_name 
            FROM events e 
            JOIN colleges c ON e.college_id = c.id
        '''
        query += ' WHERE 1=1' # Base condition to easily append filters
        params = []
        
        if college_id:
            query += ' AND e.college_id = %s'
            params.append(college_id)
        
        if event_type:
            query += ' AND e.event_type = %s'
            params.append(event_type)
        
        query += ' ORDER BY e.start_datetime'
        
        cursor.execute(query, tuple(params)) # Ensure params is a tuple
        events = cursor.fetchall()
        conn.close()
        return events
    
    @staticmethod
    def get_event(event_id):
        """Get single event by ID"""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT e.*, c.name as college_name 
            FROM events e 
            JOIN colleges c ON e.college_id = c.id 
            WHERE e.id = %s
        ''', (event_id,))
        event = cursor.fetchone()
        conn.close()
        return event if event else None
    
    @staticmethod
    def cancel_event(event_id, reason=""):
        """Cancel an event with comprehensive validation"""
        from datetime import datetime
        
        # Input validation
        if not event_id or not event_id.strip():
            return {"success": False, "message": "Event ID is required"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Check if event exists
            cursor.execute('''
                SELECT id, title, status, start_datetime, end_datetime
                FROM events 
                WHERE id = %s
            ''', (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return {"success": False, "message": "Event not found"}
            
            # Check if event is already cancelled
            if event['status'] == 'cancelled':
                return {"success": False, "message": "Event is already cancelled"}
            
            # Check if event has already ended
            event_end = event['end_datetime']
            if isinstance(event_end, str):
                event_end = datetime.strptime(event_end, '%Y-%m-%d %H:%M:%S')
            if event_end < datetime.now():
                return {"success": False, "message": "Cannot cancel an event that has already ended"}
            
            # Cancel the event
            cursor.execute('''
                UPDATE events 
                SET status = 'cancelled' 
                WHERE id = %s
            ''', (event_id,))
            
            conn.commit()
            
            # Get registration count for notification
            cursor.execute('''
                SELECT COUNT(*) as registration_count
                FROM registrations r
                WHERE r.event_id = %s AND r.status = 'registered'
            ''', (event_id,))
            
            registration_count = cursor.fetchone()['registration_count']
            
            return {
                "success": True, 
                "message": f"Event '{event['title']}' has been cancelled",
                "registration_count": registration_count,
                "reason": reason
            }
            
        except Exception as e:
            conn.rollback()
            return {"success": False, "message": f"Event cancellation failed: {str(e)}"}
        finally:
            conn.close()
    
    @staticmethod
    def reschedule_event(event_id, new_start_datetime, new_end_datetime, reason=""):
        """Reschedule an event with comprehensive validation"""
        from datetime import datetime
        
        # Input validation
        if not event_id or not event_id.strip():
            return {"success": False, "message": "Event ID is required"}
        
        if not new_start_datetime or not new_end_datetime:
            return {"success": False, "message": "New start and end datetimes are required"}
        
        # Date validation
        try:
            new_start_dt = datetime.strptime(new_start_datetime, '%Y-%m-%d %H:%M:%S')
            new_end_dt = datetime.strptime(new_end_datetime, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            return {"success": False, "message": "Invalid date format. Use YYYY-MM-DD HH:MM:SS"}
        
        if new_end_dt <= new_start_dt:
            return {"success": False, "message": "End datetime must be after start datetime"}
        
        if new_start_dt < datetime.now():
            return {"success": False, "message": "Event cannot be rescheduled to the past"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Check if event exists
            cursor.execute('''
                SELECT id, title, status, start_datetime, end_datetime
                FROM events 
                WHERE id = %s
            ''', (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return {"success": False, "message": "Event not found"}
            
            # Check if event is completed, which cannot be rescheduled
            if event['status'] == 'completed':
                return {"success": False, "message": "Cannot reschedule a completed event"}
            
            # Reschedule the event and set its status back to 'active'
            cursor.execute('''
                UPDATE events 
                SET start_datetime = %s, end_datetime = %s, status = 'active'
                WHERE id = %s
            ''', (new_start_datetime, new_end_datetime, event_id))
            
            conn.commit()
            
            return {
                "success": True, 
                "message": f"Event '{event['title']}' has been rescheduled",
                "old_start": event['start_datetime'],
                "old_end": event['end_datetime'],
                "new_start": new_start_datetime,
                "new_end": new_end_datetime,
                "reason": reason
            }
            
        except Exception as e:
            conn.rollback()
            return {"success": False, "message": f"Event rescheduling failed: {str(e)}"}
        finally:
            conn.close()

class RegistrationManager:
    """Handles student registration operations"""
    
    @staticmethod
    def register_student(event_id, student_email):
        """Register student for an event with comprehensive validation"""
        from datetime import datetime
        
        # Input validation
        if not event_id or not event_id.strip():
            return {"success": False, "message": "Event ID is required"}
        
        if not student_email or not student_email.strip():
            return {"success": False, "message": "Student email is required"}
        
        # Email format validation
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, student_email):
            return {"success": False, "message": "Invalid email format"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get student ID
            cursor.execute('SELECT id FROM students WHERE email = %s', (student_email,))
            student = cursor.fetchone()
            if not student:
                return {"success": False, "message": "Student not found"}
            
            student_id = student['id']
            
            # Check if event exists and is active
            cursor.execute('''
                SELECT id, title, status, start_datetime, max_capacity
                FROM events 
                WHERE id = %s
            ''', (event_id,))
            
            event = cursor.fetchone()
            if not event:
                return {"success": False, "message": "Event not found"}
            
            if event['status'] != 'active':
                return {"success": False, "message": f"Event is {event['status']} and cannot accept registrations"}
            
            # Check if event has already started
            event_start = event['start_datetime']
            if isinstance(event_start, str):
                event_start = datetime.strptime(event_start, '%Y-%m-%d %H:%M:%S')
            if event_start <= datetime.now():
                return {"success": False, "message": "Event has already started"}
            
            # Check if already registered
            cursor.execute(
                'SELECT id FROM registrations WHERE event_id = %s AND student_id = %s',
                (event_id, student_id)
            )
            existing = cursor.fetchone()
            
            if existing:
                return {"success": False, "message": "Already registered for this event"}
            
            # Check event capacity
            if event['max_capacity'] > 0:
                cursor.execute(
                    'SELECT COUNT(*) as count FROM registrations WHERE event_id = %s AND status = "registered"',
                    (event_id,)
                )
                current_registrations = cursor.fetchone()['count']
                
                if current_registrations >= event['max_capacity']:
                    return {"success": False, "message": "Event is full"}
            
            # Register student
            cursor.execute(
                'INSERT INTO registrations (event_id, student_id) VALUES (%s, %s)',
                (event_id, student_id)
            )
            
            conn.commit()
            return {"success": True, "message": "Successfully registered"}
            
        except Exception as e:
            conn.rollback()
            return {"success": False, "message": f"Registration failed: {str(e)}"}
        finally:
            conn.close()
    
    @staticmethod
    def mark_attendance(event_id, student_email):
        """Mark attendance for a registered student with comprehensive validation"""
        from datetime import datetime
        
        # Input validation
        if not event_id or not event_id.strip():
            return {"success": False, "message": "Event ID is required"}
        
        if not student_email or not student_email.strip():
            return {"success": False, "message": "Student email is required"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get registration with event details
            cursor.execute('''
                SELECT r.id, e.title, e.status, e.start_datetime, e.end_datetime
                FROM registrations r
                JOIN students s ON r.student_id = s.id
                JOIN events e ON r.event_id = e.id
                WHERE r.event_id = %s AND s.email = %s AND r.status = 'registered'
            ''', (event_id, student_email))
            
            registration = cursor.fetchone()
            
            if not registration:
                return {"success": False, "message": "Registration not found or student not registered"}
            
            # Check if event is active
            if registration['status'] != 'active':
                return {"success": False, "message": f"Event is {registration['status']} and attendance cannot be marked"}
            
            # Check if event is currently happening
            event_start = registration['start_datetime']
            event_end = registration['end_datetime']
            
            if isinstance(event_start, str):
                event_start = datetime.strptime(event_start, '%Y-%m-%d %H:%M:%S')
            if isinstance(event_end, str):
                event_end = datetime.strptime(event_end, '%Y-%m-%d %H:%M:%S')
            
            now = datetime.now()
            
            if now < event_start:
                return {"success": False, "message": "Event has not started yet"}
            
            if now > event_end:
                return {"success": False, "message": "Event has already ended"}
            
            registration_id = registration['id']
            
            # Check if already checked in
            cursor.execute(
                'SELECT id FROM attendance WHERE registration_id = %s',
                (registration_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                return {"success": False, "message": "Already checked in"}
            
            # Mark attendance
            cursor.execute(
                'INSERT INTO attendance (registration_id) VALUES (%s)',
                (registration_id,)
            )
            
            conn.commit()
            return {"success": True, "message": "Attendance marked successfully"}
            
        except Exception as e:
            conn.rollback()
            return {"success": False, "message": f"Attendance marking failed: {str(e)}"}
        finally:
            conn.close()
    
    @staticmethod
    def submit_feedback(event_id, student_email, rating, comments=""):
        """Submit feedback for an attended event with comprehensive validation"""
        from datetime import datetime
        
        # Input validation
        if not event_id or not event_id.strip():
            return {"success": False, "message": "Event ID is required"}
        
        if not student_email or not student_email.strip():
            return {"success": False, "message": "Student email is required"}
        
        # Rating validation
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return {"success": False, "message": "Rating must be an integer between 1 and 5"}
        
        # Comments validation (optional but limit length)
        if comments and len(comments) > 1000:
            return {"success": False, "message": "Comments cannot exceed 1000 characters"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get registration with attendance and event details
            cursor.execute('''
                SELECT r.id, e.title, e.status, e.end_datetime, a.checked_in_at
                FROM registrations r
                JOIN students s ON r.student_id = s.id
                JOIN events e ON r.event_id = e.id
                JOIN attendance a ON r.id = a.registration_id
                WHERE r.event_id = %s AND s.email = %s
            ''', (event_id, student_email))
            
            registration = cursor.fetchone()
            
            if not registration:
                return {"success": False, "message": "Must attend event to submit feedback"}
            
            # Check if event is active or completed
            if registration['status'] not in ['active', 'completed']:
                return {"success": False, "message": f"Event is {registration['status']} and feedback cannot be submitted"}
            
            # Check if event has ended (allow feedback after event ends)
            event_end = registration['end_datetime']
            if isinstance(event_end, str):
                event_end = datetime.strptime(event_end, '%Y-%m-%d %H:%M:%S')
            now = datetime.now()
            
            if now < event_end:
                return {"success": False, "message": "Feedback can only be submitted after the event ends"}
            
            registration_id = registration['id']
            
            # Check if feedback already submitted
            cursor.execute(
                'SELECT id FROM feedback WHERE registration_id = %s',
                (registration_id,)
            )
            existing = cursor.fetchone()
            
            if existing:
                return {"success": False, "message": "Feedback already submitted"}
            
            # Submit feedback
            cursor.execute(
                'INSERT INTO feedback (registration_id, rating, comments) VALUES (%s, %s, %s)',
                (registration_id, rating, comments)
            )
            
            conn.commit()
            return {"success": True, "message": "Feedback submitted successfully"}
            
        except Exception as e:
            conn.rollback()
            return {"success": False, "message": f"Feedback submission failed: {str(e)}"}
        finally:
            conn.close()





