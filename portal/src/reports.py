"""
Reporting functionality for Campus Event Management Platform
"""
from database import get_db_connection

class ReportManager:
    """Handles all reporting operations"""
    
    @staticmethod
    def event_popularity_report(event_type=None, college_id=None):
        """Generate event popularity report sorted by registrations"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                e.id,
                e.title,
                e.event_type,
                c.name as college_name,
                e.start_datetime,
                e.location,
                COUNT(r.id) as total_registrations,
                e.max_capacity
            FROM events e
            LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
            JOIN colleges c ON e.college_id = c.id
            WHERE e.status = 'active'
        '''
        params = []
        
        if event_type:
            query += ' AND e.event_type = %s'
            params.append(event_type)
        
        if college_id:
            query += ' AND e.college_id = %s'
            params.append(college_id)
        
        query += '''
            GROUP BY e.id
            ORDER BY total_registrations DESC, e.start_datetime
        '''
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        
        return results
    
    @staticmethod
    def student_participation_report(college_id=None):
        """Generate student participation report"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                s.id,
                s.name,
                s.email,
                s.student_id,
                c.name as college_name,
                COUNT(DISTINCT r.event_id) as events_registered,
                COUNT(DISTINCT a.registration_id) as events_attended,
                CASE 
                    WHEN COUNT(DISTINCT r.event_id) > 0 
                    THEN ROUND(COUNT(DISTINCT a.registration_id) * 100.0 / COUNT(DISTINCT r.event_id), 2)
                    ELSE 0 
                END as attendance_rate
            FROM students s
            LEFT JOIN registrations r ON s.id = r.student_id AND r.status = 'registered'
            LEFT JOIN attendance a ON r.id = a.registration_id
            JOIN colleges c ON s.college_id = c.id
        '''
        params = []
        
        if college_id:
            query += ' WHERE s.college_id = %s'
            params.append(college_id)
        
        query += '''
            GROUP BY s.id
            ORDER BY events_attended DESC, events_registered DESC
        '''
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        conn.close()
        
        return results
    
    @staticmethod
    def attendance_analytics():
        """Generate attendance analytics per event"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                e.id,
                e.title,
                e.event_type,
                c.name as college_name,
                e.start_datetime,
                COUNT(r.id) as total_registrations,
                COUNT(a.id) as total_attendance,
                CASE 
                    WHEN COUNT(r.id) > 0 
                    THEN ROUND(COUNT(a.id) * 100.0 / COUNT(r.id), 2)
                    ELSE 0 
                END as attendance_percentage
            FROM events e
            LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'registered'
            LEFT JOIN attendance a ON r.id = a.registration_id
            JOIN colleges c ON e.college_id = c.id
            WHERE e.status = 'active'
            GROUP BY e.id
            ORDER BY attendance_percentage DESC, total_registrations DESC
        ''')
        results = cursor.fetchall()
        
        conn.close()
        return results
    
    @staticmethod
    def feedback_summary():
        """Generate feedback summary report"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                e.id,
                e.title,
                e.event_type,
                c.name as college_name,
                COUNT(f.id) as total_feedback,
                ROUND(AVG(f.rating), 2) as average_rating,
                COUNT(CASE WHEN f.rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN f.rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN f.rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN f.rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN f.rating = 1 THEN 1 END) as one_star
            FROM events e
            LEFT JOIN registrations r ON e.id = r.event_id
            LEFT JOIN feedback f ON r.id = f.registration_id
            JOIN colleges c ON e.college_id = c.id
            WHERE e.status = 'active'
            GROUP BY e.id
            HAVING total_feedback > 0
            ORDER BY average_rating DESC, total_feedback DESC
        ''')
        results = cursor.fetchall()
        
        conn.close()
        return results
    
    @staticmethod
    def top_active_students(limit=3):
        """Get top N most active students"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                s.id,
                s.name,
                s.email,
                s.student_id,
                c.name as college_name,
                COUNT(DISTINCT a.registration_id) as events_attended,
                COUNT(DISTINCT r.event_id) as events_registered,
                COUNT(DISTINCT f.registration_id) as feedback_given,
                ROUND(AVG(f.rating), 2) as average_rating_given
            FROM students s
            JOIN registrations r ON s.id = r.student_id AND r.status = 'registered'
            JOIN attendance a ON r.id = a.registration_id
            LEFT JOIN feedback f ON r.id = f.registration_id
            JOIN colleges c ON s.college_id = c.id
            GROUP BY s.id
            ORDER BY events_attended DESC, events_registered DESC, feedback_given DESC
            LIMIT %s
        ''', (limit,))
        results = cursor.fetchall()
        
        conn.close()
        return results
    
    @staticmethod
    def college_summary():
        """Generate college-wise summary report"""
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all colleges first
        cursor.execute('SELECT id, name, location FROM colleges ORDER BY name')
        colleges = cursor.fetchall()
        
        # Get student counts per college
        cursor.execute('''
            SELECT college_id, COUNT(*) as total_students
            FROM students
            GROUP BY college_id
        ''')
        student_counts = {row['college_id']: row['total_students'] for row in cursor.fetchall()}
        
        # Get event counts per college
        cursor.execute('''
            SELECT college_id, COUNT(*) as total_events
            FROM events
            WHERE status = 'active'
            GROUP BY college_id
        ''')
        event_counts = {row['college_id']: row['total_events'] for row in cursor.fetchall()}
        
        # Get registration counts per college
        cursor.execute('''
            SELECT e.college_id, COUNT(r.id) as total_registrations
            FROM events e
            JOIN registrations r ON e.id = r.event_id
            WHERE e.status = 'active' AND r.status = 'registered'
            GROUP BY e.college_id
        ''')
        registration_counts = {row['college_id']: row['total_registrations'] for row in cursor.fetchall()}
        
        # Get attendance counts per college
        cursor.execute('''
            SELECT e.college_id, COUNT(a.id) as total_attendance
            FROM events e
            JOIN registrations r ON e.id = r.event_id
            JOIN attendance a ON r.id = a.registration_id
            WHERE e.status = 'active' AND r.status = 'registered'
            GROUP BY e.college_id
        ''')
        attendance_counts = {row['college_id']: row['total_attendance'] for row in cursor.fetchall()}
        
        # Combine all data
        results = []
        for college in colleges:
            college_id = college['id']
            
            total_students = student_counts.get(college_id, 0)
            total_events = event_counts.get(college_id, 0)
            total_registrations = registration_counts.get(college_id, 0)
            total_attendance = attendance_counts.get(college_id, 0)
            
            # Calculate attendance rate
            if total_registrations > 0:
                overall_attendance_rate = round(total_attendance * 100.0 / total_registrations, 2)
            else:
                overall_attendance_rate = 0.0
            
            results.append({
                'id': college_id,
                'college_name': college['name'],
                'location': college['location'],
                'total_students': total_students,
                'total_events': total_events,
                'total_registrations': total_registrations,
                'total_attendance': total_attendance,
                'overall_attendance_rate': overall_attendance_rate
            })
        
        # Sort by events and registrations
        results.sort(key=lambda x: (x['total_events'], x['total_registrations']), reverse=True)
        
        conn.close()
        return results





