"""
Database setup and utility functions for Campus Event Management Platform
"""
import pymysql
import pymysql.err
import uuid
from datetime import datetime, timedelta
import os

# MySQL connection configuration (supports environment variables)
MYSQL_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', '1111'),
    'database': os.getenv('DB_NAME', 'portal'),
    'charset': 'utf8mb4',
    'autocommit': False,
    'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', 10)),
    'read_timeout': int(os.getenv('DB_READ_TIMEOUT', 10)),
    'write_timeout': int(os.getenv('DB_WRITE_TIMEOUT', 10))
}

def get_db_connection():
    """Get MySQL database connection with improved error handling"""
    try:
        conn = pymysql.connect(
            host=MYSQL_CONFIG['host'],
            port=MYSQL_CONFIG['port'],
            user=MYSQL_CONFIG['user'],
            password=MYSQL_CONFIG['password'],
            database=MYSQL_CONFIG['database'],
            charset=MYSQL_CONFIG['charset'],
            autocommit=MYSQL_CONFIG['autocommit'],
            connect_timeout=MYSQL_CONFIG['connect_timeout'],
            read_timeout=MYSQL_CONFIG['read_timeout'],
            write_timeout=MYSQL_CONFIG['write_timeout'],
            cursorclass=pymysql.cursors.DictCursor  # Return rows as dictionaries
        )
        return conn
    except pymysql.err.OperationalError as e:
        print(f"❌ MySQL connection failed: {str(e)}")
        print("💡 Troubleshooting tips:")
        print("   1. Ensure MySQL server is running")
        print("   2. Verify database 'portal' exists")
        print("   3. Check username/password (root/1111)")
        print("   4. Ensure MySQL is accessible on localhost:3306")
        raise
    except Exception as e:
        print(f"❌ Unexpected database error: {str(e)}")
        raise

def execute_with_retry(query, params=None, retries=3):
    """Execute query with connection retry logic"""
    for attempt in range(retries):
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            result = cursor.fetchall()
            conn.commit()
            conn.close()
            return result
            
        except pymysql.err.OperationalError as e:
            if "MySQL server has gone away" in str(e) and attempt < retries - 1:
                print(f"🔄 MySQL connection lost, retrying... (attempt {attempt + 1})")
                continue
            else:
                raise
        except Exception as e:
            conn.close()
            raise

def init_database():
    """Initialize database with all tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create colleges table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS colleges (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            location VARCHAR(255),
            contact_email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            college_id INT NOT NULL,
            student_id VARCHAR(50) NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (college_id) REFERENCES colleges(id),
            UNIQUE KEY unique_college_student (college_id, student_id)
        )
    ''')
    
    # Create events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_type VARCHAR(50) NOT NULL,
            college_id INT NOT NULL,
            created_by VARCHAR(255) NOT NULL,
            start_datetime TIMESTAMP NOT NULL,
            end_datetime TIMESTAMP NOT NULL,
            location VARCHAR(255),
            max_capacity INT DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (college_id) REFERENCES colleges(id)
        )
    ''')
    
    # Create registrations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS registrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            event_id VARCHAR(36) NOT NULL,
            student_id INT NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'registered',
            FOREIGN KEY (event_id) REFERENCES events(id),
            FOREIGN KEY (student_id) REFERENCES students(id),
            UNIQUE KEY unique_event_student (event_id, student_id)
        )
    ''')
    
    # Create attendance table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            registration_id INT NOT NULL,
            checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checked_out_at TIMESTAMP NULL,
            FOREIGN KEY (registration_id) REFERENCES registrations(id),
            UNIQUE KEY unique_registration (registration_id)
        )
    ''')
    
    # Create feedback table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            registration_id INT NOT NULL,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comments TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (registration_id) REFERENCES registrations(id),
            UNIQUE KEY unique_feedback (registration_id)
        )
    ''')
    
    # Create indexes for performance (MySQL compatible)
    try:
        cursor.execute('CREATE INDEX idx_events_college_type ON events(college_id, event_type)')
    except pymysql.err.OperationalError as e:
        if "Duplicate key name" not in str(e):
            raise
    
    try:
        cursor.execute('CREATE INDEX idx_events_datetime ON events(start_datetime, end_datetime)')
    except pymysql.err.OperationalError as e:
        if "Duplicate key name" not in str(e):
            raise
    
    try:
        cursor.execute('CREATE INDEX idx_registrations_event ON registrations(event_id)')
    except pymysql.err.OperationalError as e:
        if "Duplicate key name" not in str(e):
            raise
    
    try:
        cursor.execute('CREATE INDEX idx_registrations_student ON registrations(student_id)')
    except pymysql.err.OperationalError as e:
        if "Duplicate key name" not in str(e):
            raise
    
    try:
        cursor.execute('CREATE INDEX idx_attendance_registration ON attendance(registration_id)')
    except pymysql.err.OperationalError as e:
        if "Duplicate key name" not in str(e):
            raise
    
    try:
        cursor.execute('CREATE INDEX idx_feedback_registration ON feedback(registration_id)')
    except pymysql.err.OperationalError as e:
        if "Duplicate key name" not in str(e):
            raise
    
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

def load_sample_data():
    """Load sample data for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Sample colleges
    colleges = [
        ("BRP College of Engineering", "Pune", "contact@brp.edu"),
        ("VTU University", "Vellore", "info@vtu.ac.in"),
        ("mvjce", "banglore", "contact@mvjce.ac.in")
    ]
    
    for college in colleges:
        cursor.execute(
            "INSERT IGNORE INTO colleges (name, location, contact_email) VALUES (%s, %s, %s)",
            college
        )
    
    # Sample students
    students = [
        ("Alice Johnson", "alice@student.com", 1, "CS001", "9876543210"),
        ("Bob Smith", "bob@student.com", 1, "CS002", "9876543211"),
        ("Charlie Brown", "charlie@student.com", 2, "CS003", "9876543212"),
        ("Diana Prince", "diana@student.com", 2, "CS004", "9876543213"),
        ("Eve Wilson", "eve@student.com", 3, "CS005", "9876543214"),
        ("Frank Miller", "frank@student.com", 1, "CS006", "9876543215"),
        ("Grace Lee", "grace@student.com", 2, "CS007", "9876543216"),
        ("Henry Ford", "henry@student.com", 3, "CS008", "9876543217")
    ]
    
    for student in students:
        cursor.execute(
            "INSERT IGNORE INTO students (name, email, college_id, student_id, phone) VALUES (%s, %s, %s, %s, %s)",
            student
        )
    
    # Sample events
    now = datetime.now()
    events = [
        (str(uuid.uuid4()), "AI/ML Workshop", "Learn machine learning basics", "workshop", 1, 
         "staff@mitcoe.edu", now + timedelta(days=7), now + timedelta(days=7, hours=4), 
         "Lab 101", 50),
        (str(uuid.uuid4()), "Hackathon 2025", "24-hour coding challenge", "hackathon", 1,
         "staff@mitcoe.edu", now + timedelta(days=14), now + timedelta(days=15),
         "Main Hall", 100),
        (str(uuid.uuid4()), "Tech Talk: Blockchain", "Understanding blockchain technology", "tech_talk", 2,
         "prof@vit.ac.in", now + timedelta(days=21), now + timedelta(days=21, hours=2),
         "Auditorium", 200),
        (str(uuid.uuid4()), "Web Development Fest", "Full stack development competition", "fest", 3,
         "admin@iitb.ac.in", now + timedelta(days=28), now + timedelta(days=28, hours=8),
         "Computer Lab", 75)
    ]
    
    for event in events:
        cursor.execute(
            """INSERT IGNORE INTO events 
            (id, title, description, event_type, college_id, created_by, start_datetime, end_datetime, location, max_capacity)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            event
        )
    
    conn.commit()
    conn.close()
    print("Sample data loaded successfully!")

if __name__ == "__main__":
    init_database()
    load_sample_data()





