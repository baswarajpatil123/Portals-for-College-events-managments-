"""
Flask application for Campus Event Management Platform
Simple and minimal API implementation
"""
from flask import Flask, request, jsonify, render_template
from datetime import datetime
import uuid

from database import init_database, get_db_connection
from models import EventManager, RegistrationManager
from reports import ReportManager

app = Flask(__name__, template_folder='../templates', static_folder='../static')

# Initialize database on startup
@app.before_request
def initialize():
    if not hasattr(initialize, 'done'):
        init_database()
        initialize.done = True

# Helper function for error responses
def error_response(message, status_code=400):
    return jsonify({"success": False, "message": message}), status_code

def success_response(data=None, message="Success"):
    response = {"success": True, "message": message}
    if data:
        response["data"] = data
    return jsonify(response)

# Event Management Endpoints
@app.route('/api/events', methods=['POST'])
def create_event():
    """Create a new event"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'event_type', 'college_id', 'created_by', 
                          'start_datetime', 'end_datetime']
        for field in required_fields:
            if field not in data:
                return error_response(f"Missing required field: {field}")
        
        # Create event
        event_id = EventManager.create_event(
            title=data['title'],
            description=data.get('description', ''),
            event_type=data['event_type'],
            college_id=data['college_id'],
            created_by=data['created_by'],
            start_datetime=data['start_datetime'],
            end_datetime=data['end_datetime'],
            location=data.get('location', ''),
            max_capacity=data.get('max_capacity', 0)
        )
        
        return success_response({"event_id": event_id}, "Event created successfully")
    
    except Exception as e:
        return error_response(f"Error creating event: {str(e)}", 500)

@app.route('/api/events', methods=['GET'])
def get_events():
    """Get all events with optional filtering"""
    try:
        college_id = request.args.get('college_id', type=int)
        event_type = request.args.get('event_type')
        
        events = EventManager.get_events(college_id=college_id, event_type=event_type)
        return success_response(events)
    
    except Exception as e:
        return error_response(f"Error fetching events: {str(e)}", 500)

@app.route('/api/events/<event_id>', methods=['GET'])
def get_event(event_id):
    """Get single event details"""
    try:
        event = EventManager.get_event(event_id)
        if not event:
            return error_response("Event not found", 404)
        
        return success_response(event)
    
    except Exception as e:
        return error_response(f"Error fetching event: {str(e)}", 500)

@app.route('/api/events/<event_id>/cancel', methods=['POST'])
def cancel_event(event_id):
    """Cancel an event"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason', '')
        
        result = EventManager.cancel_event(event_id, reason)
        
        if result['success']:
            return success_response(result, result['message'])
        else:
            return error_response(result['message'])
    
    except Exception as e:
        return error_response(f"Error cancelling event: {str(e)}", 500)

@app.route('/api/events/<event_id>/reschedule', methods=['POST'])
def reschedule_event(event_id):
    """Reschedule an event"""
    try:
        data = request.get_json()
        
        required_fields = ['new_start_datetime', 'new_end_datetime']
        for field in required_fields:
            if field not in data:
                return error_response(f"Missing required field: {field}")
        
        reason = data.get('reason', '')
        
        result = EventManager.reschedule_event(
            event_id, 
            data['new_start_datetime'], 
            data['new_end_datetime'], 
            reason
        )
        
        if result['success']:
            return success_response(result, result['message'])
        else:
            return error_response(result['message'])
    
    except Exception as e:
        return error_response(f"Error rescheduling event: {str(e)}", 500)

# Registration Endpoints
@app.route('/api/events/<event_id>/register', methods=['POST'])
def register_for_event(event_id):
    """Register student for an event"""
    try:
        data = request.get_json()
        
        if 'student_email' not in data:
            return error_response("student_email is required")
        
        result = RegistrationManager.register_student(event_id, data['student_email'])
        
        if result['success']:
            return success_response(message=result['message'])
        else:
            return error_response(result['message'])
    
    except Exception as e:
        return error_response(f"Error registering student: {str(e)}", 500)

@app.route('/api/events/<event_id>/checkin', methods=['POST'])
def checkin_to_event(event_id):
    """Mark attendance for a student"""
    try:
        data = request.get_json()
        
        if 'student_email' not in data:
            return error_response("student_email is required")
        
        result = RegistrationManager.mark_attendance(event_id, data['student_email'])
        
        if result['success']:
            return success_response(message=result['message'])
        else:
            return error_response(result['message'])
    
    except Exception as e:
        return error_response(f"Error marking attendance: {str(e)}", 500)

@app.route('/api/events/<event_id>/feedback', methods=['POST'])
def submit_feedback(event_id):
    """Submit feedback for an event"""
    try:
        data = request.get_json()
        
        required_fields = ['student_email', 'rating']
        for field in required_fields:
            if field not in data:
                return error_response(f"Missing required field: {field}")
        
        # Validate rating
        rating = data['rating']
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return error_response("Rating must be an integer between 1 and 5")
        
        result = RegistrationManager.submit_feedback(
            event_id, 
            data['student_email'], 
            rating, 
            data.get('comments', '')
        )
        
        if result['success']:
            return success_response(message=result['message'])
        else:
            return error_response(result['message'])
    
    except Exception as e:
        return error_response(f"Error submitting feedback: {str(e)}", 500)

# Reporting Endpoints
@app.route('/api/reports/popularity', methods=['GET'])
def event_popularity_report():
    """Get event popularity report"""
    try:
        event_type = request.args.get('event_type')
        college_id = request.args.get('college_id', type=int)
        
        report = ReportManager.event_popularity_report(event_type=event_type, college_id=college_id)
        return success_response(report)
    
    except Exception as e:
        return error_response(f"Error generating popularity report: {str(e)}", 500)

@app.route('/api/reports/participation', methods=['GET'])
def student_participation_report():
    """Get student participation report"""
    try:
        college_id = request.args.get('college_id', type=int)
        
        report = ReportManager.student_participation_report(college_id=college_id)
        return success_response(report)
    
    except Exception as e:
        return error_response(f"Error generating participation report: {str(e)}", 500)

@app.route('/api/reports/attendance', methods=['GET'])
def attendance_analytics():
    """Get attendance analytics"""
    try:
        report = ReportManager.attendance_analytics()
        return success_response(report)
    
    except Exception as e:
        return error_response(f"Error generating attendance report: {str(e)}", 500)

@app.route('/api/reports/feedback', methods=['GET'])
def feedback_summary():
    """Get feedback summary report"""
    try:
        report = ReportManager.feedback_summary()
        return success_response(report)
    
    except Exception as e:
        return error_response(f"Error generating feedback report: {str(e)}", 500)

@app.route('/api/reports/top-students', methods=['GET'])
def top_active_students():
    """Get top active students"""
    try:
        limit = request.args.get('limit', 3, type=int)
        report = ReportManager.top_active_students(limit=limit)
        return success_response(report)
    
    except Exception as e:
        return error_response(f"Error generating top students report: {str(e)}", 500)

@app.route('/api/reports/colleges', methods=['GET'])
def college_summary():
    """Get college summary report"""
    try:
        report = ReportManager.college_summary()
        return success_response(report)
    
    except Exception as e:
        return error_response(f"Error generating college summary: {str(e)}", 500)

# Utility Endpoints
@app.route('/api/colleges', methods=['GET'])
def get_colleges():
    """Get all colleges"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM colleges ORDER BY name')
        colleges = cursor.fetchall()
        conn.close()
        
        return success_response(colleges)
    
    except Exception as e:
        return error_response(f"Error fetching colleges: {str(e)}", 500)

@app.route('/api/students/<student_email>/attended-events', methods=['GET'])
def get_student_attended_events(student_email):
    """Get events that a student has attended"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get events that the student has attended
        cursor.execute('''
            SELECT DISTINCT e.id, e.title, e.event_type, e.start_datetime, e.end_datetime, 
                   e.location, c.name as college_name
            FROM events e
            JOIN registrations r ON e.id = r.event_id
            JOIN students s ON r.student_id = s.id
            JOIN attendance a ON r.id = a.registration_id
            JOIN colleges c ON e.college_id = c.id
            WHERE s.email = %s AND r.status = 'registered'
            ORDER BY e.start_datetime DESC
        ''', (student_email,))
        
        events = cursor.fetchall()
        conn.close()
        
        return success_response(events)
    
    except Exception as e:
        return error_response(f"Error fetching attended events: {str(e)}", 500)

@app.route('/api/students/<student_email>/my-events', methods=['GET'])
def get_student_my_events(student_email):
    """Get student's events categorized by registration status"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get student info
        cursor.execute('SELECT id FROM students WHERE email = %s', (student_email,))
        student = cursor.fetchone()
        if not student:
            return error_response("Student not found", 404)
        
        student_id = student['id']
        
        # Get all events with student's registration status
        cursor.execute('''
            SELECT e.id, e.title, e.event_type, e.start_datetime, e.end_datetime, 
                   e.location, c.name as college_name, e.status as event_status,
                   r.id as registration_id, r.status as registration_status, r.registered_at,
                   CASE 
                       WHEN a.id IS NOT NULL THEN 'attended'
                       WHEN r.id IS NOT NULL THEN 'registered'
                       ELSE 'not_registered'
                   END as student_status
            FROM events e
            JOIN colleges c ON e.college_id = c.id
            LEFT JOIN registrations r ON e.id = r.event_id AND r.student_id = %s
            LEFT JOIN attendance a ON r.id = a.registration_id
            WHERE e.status = 'active'
            ORDER BY e.start_datetime ASC
        ''', (student_id,))
        
        all_events = cursor.fetchall()
        
        # Categorize events
        from datetime import datetime
        now = datetime.now()
        
        upcoming_events = []
        registered_events = []
        attended_events = []
        
        for event in all_events:
            event_time = event['start_datetime']
            student_status = event['student_status']
            
            if student_status == 'attended':
                attended_events.append(event)
            elif student_status == 'registered':
                registered_events.append(event)
            else:
                if event_time > now:
                    upcoming_events.append(event)
        
        result = {
            'upcoming': upcoming_events,
            'registered': registered_events,
            'attended': attended_events
        }
        
        conn.close()
        return success_response(result)
    
    except Exception as e:
        return error_response(f"Error fetching student events: {str(e)}", 500)

@app.route('/api/students/<student_email>/stats', methods=['GET'])
def get_student_stats(student_email):
    """Get student statistics (registrations, attendance, feedback)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get student info
        cursor.execute('''
            SELECT s.id, s.name, s.email, c.name as college_name
            FROM students s
            JOIN colleges c ON s.college_id = c.id
            WHERE s.email = %s
        ''', (student_email,))
        
        student = cursor.fetchone()
        if not student:
            return error_response("Student not found", 404)
        
        # Count registrations (excluding those that have attendance)
        cursor.execute('''
            SELECT COUNT(*) as total_registrations
            FROM registrations r
            LEFT JOIN attendance a ON r.id = a.registration_id
            WHERE r.student_id = %s AND r.status = 'registered' AND a.id IS NULL
        ''', (student['id'],))
        
        registrations_count = cursor.fetchone()['total_registrations']
        
        # Count attendance
        cursor.execute('''
            SELECT COUNT(*) as total_attendance
            FROM attendance a
            JOIN registrations r ON a.registration_id = r.id
            WHERE r.student_id = %s
        ''', (student['id'],))
        
        attendance_count = cursor.fetchone()['total_attendance']
        
        # Count total registrations (including attended)
        cursor.execute('''
            SELECT COUNT(*) as total_registrations_all
            FROM registrations r
            WHERE r.student_id = %s AND r.status = 'registered'
        ''', (student['id'],))
        
        total_registrations_all = cursor.fetchone()['total_registrations_all']
        
        # Count feedback given
        cursor.execute('''
            SELECT COUNT(*) as total_feedback
            FROM feedback f
            JOIN registrations r ON f.registration_id = r.id
            WHERE r.student_id = %s
        ''', (student['id'],))
        
        feedback_count = cursor.fetchone()['total_feedback']
        
        stats = {
            'student_id': student['id'],
            'name': student['name'],
            'email': student['email'],
            'college_name': student['college_name'],
            'total_registrations': registrations_count,  # Only registered (not attended)
            'total_attendance': attendance_count,
            'total_feedback': feedback_count,
            'total_registrations_all': total_registrations_all  # All registrations including attended
        }
        
        conn.close()
        return success_response(stats)
    
    except Exception as e:
        return error_response(f"Error fetching student stats: {str(e)}", 500)

@app.route('/api/students/<student_email>/attended-events-no-feedback', methods=['GET'])
def get_student_attended_events_no_feedback(student_email):
    """Get events that a student has attended but hasn't given feedback for"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get events that the student has attended but hasn't given feedback for
        cursor.execute('''
            SELECT DISTINCT e.id, e.title, e.event_type, e.start_datetime, e.end_datetime, 
                   e.location, c.name as college_name
            FROM events e
            JOIN registrations r ON e.id = r.event_id
            JOIN students s ON r.student_id = s.id
            JOIN attendance a ON r.id = a.registration_id
            JOIN colleges c ON e.college_id = c.id
            LEFT JOIN feedback f ON r.id = f.registration_id
            WHERE s.email = %s AND r.status = 'registered' AND f.id IS NULL
            ORDER BY e.start_datetime DESC
        ''', (student_email,))
        
        events = cursor.fetchall()
        conn.close()
        
        return success_response(events)
    
    except Exception as e:
        return error_response(f"Error fetching attended events without feedback: {str(e)}", 500)

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get students with optional college filter"""
    try:
        college_id = request.args.get('college_id', type=int)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        query = '''
            SELECT s.*, c.name as college_name 
            FROM students s 
            JOIN colleges c ON s.college_id = c.id
        '''
        params = []
        
        if college_id:
            query += ' WHERE s.college_id = %s'
            params.append(college_id)
        
        query += ' ORDER BY s.name'
        
        cursor.execute(query, params)
        students = cursor.fetchall()
        conn.close()
        
        return success_response(students)
    
    except Exception as e:
        return error_response(f"Error fetching students: {str(e)}", 500)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return success_response({"status": "healthy", "timestamp": datetime.now().isoformat()})

# Web UI Routes
@app.route('/')
def index():
    """Main dashboard page (legacy interface)"""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard page"""
    return render_template('index.html')

@app.route('/events')
def events_page():
    """Events page"""
    return render_template('index.html')

@app.route('/students')
def students_page():
    """Students page"""
    return render_template('index.html')

@app.route('/reports')
def reports_page():
    """Reports page"""
    return render_template('index.html')

@app.route('/create-event')
def create_event_page():
    """Create event page"""
    return render_template('index.html')

# Admin Portal Routes
@app.route('/admin-portal')
def admin_portal():
    """Admin Portal - For college staff to manage events"""
    return render_template('admin_portal.html')

@app.route('/admin')
def admin_redirect():
    """Redirect /admin to /admin-portal"""
    return render_template('admin_portal.html')

# Student App Routes
@app.route('/student-app')
def student_app():
    """Student App - Mobile-friendly interface for students"""
    return render_template('student_app.html')

@app.route('/mobile')
def mobile_redirect():
    """Redirect /mobile to /student-app"""
    return render_template('student_app.html')

# PWA Routes
@app.route('/manifest.json')
def serve_manifest():
    """Serve PWA manifest file"""
    from flask import send_from_directory
    import os
    return send_from_directory(os.path.dirname(os.path.dirname(__file__)), 'manifest.json')

@app.route('/sw.js')
def serve_service_worker():
    """Serve service worker file"""
    from flask import send_from_directory
    import os
    return send_from_directory(os.path.dirname(os.path.dirname(__file__)), 'sw.js')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
