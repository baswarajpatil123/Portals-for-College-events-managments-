# Database Schema Design

## Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    COLLEGES     │    │     EVENTS      │    │    STUDENTS     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ name            │    │ title           │    │ name            │
│ location        │    │ description     │    │ email           │
│ contact_email   │    │ event_type      │    │ college_id (FK) │
│ created_at      │    │ college_id (FK) │    │ student_id      │
└─────────────────┘    │ created_by      │    │ phone           │
         │              │ start_datetime  │    │ created_at      │
         │              │ end_datetime    │    └─────────────────┘
         │              │ location        │             │
         │              │ max_capacity    │             │
         │              │ status          │             │
         │              │ created_at      │             │
         │              └─────────────────┘             │
         │                       │                      │
         └───────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ REGISTRATIONS   │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ event_id (FK)   │
                    │ student_id (FK) │
                    │ registered_at   │
                    │ status          │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │   ATTENDANCE    │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ registration_id │
                    │ checked_in_at   │
                    │ checked_out_at  │
                    └─────────────────┘
                             │
                    ┌─────────────────┐
                    │    FEEDBACK     │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ registration_id │
                    │ rating (1-5)    │
                    │ comments        │
                    │ submitted_at    │
                    └─────────────────┘
```

## Table Definitions

### COLLEGES
Stores information about participating colleges.

```sql
CREATE TABLE colleges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### STUDENTS
Stores student information linked to their colleges.

```sql
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    college_id INTEGER NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id),
    UNIQUE(college_id, student_id)
);
```

### EVENTS
Stores event information created by college staff.

```sql
CREATE TABLE events (
    id VARCHAR(36) PRIMARY KEY, -- UUID for global uniqueness
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- hackathon, workshop, tech_talk, fest
    college_id INTEGER NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- staff member email
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    location VARCHAR(255),
    max_capacity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(id)
);
```

### REGISTRATIONS
Tracks student registrations for events.

```sql
CREATE TABLE registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id VARCHAR(36) NOT NULL,
    student_id INTEGER NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'registered', -- registered, cancelled
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    UNIQUE(event_id, student_id) -- Prevent duplicate registrations
);
```

### ATTENDANCE
Tracks actual attendance at events.

```sql
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_out_at TIMESTAMP NULL,
    FOREIGN KEY (registration_id) REFERENCES registrations(id),
    UNIQUE(registration_id) -- One attendance record per registration
);
```

### FEEDBACK
Stores student feedback for attended events.

```sql
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registration_id) REFERENCES registrations(id),
    UNIQUE(registration_id) -- One feedback per registration
);
```

## Key Design Decisions

### 1. Global Event IDs
- Events use UUID format for global uniqueness across all colleges
- Enables cross-college analytics and prevents ID conflicts

### 2. Centralized vs Distributed Data
- **Choice**: Centralized database
- **Rationale**: 
  - Enables cross-college insights
  - Simplified management
  - Better for analytics at scale
  - Single source of truth

### 3. Registration-Centric Design
- Attendance and feedback are linked to registrations, not directly to events
- Ensures data integrity (can't attend without registering)
- Simplifies queries and reporting

### 4. Soft Delete Approach
- Events have status field instead of hard deletion
- Preserves historical data for analytics
- Handles cancelled events gracefully

## Indexes for Performance

```sql
-- Frequently queried combinations
CREATE INDEX idx_events_college_type ON events(college_id, event_type);
CREATE INDEX idx_events_datetime ON events(start_datetime, end_datetime);
CREATE INDEX idx_registrations_event ON registrations(event_id);
CREATE INDEX idx_registrations_student ON registrations(student_id);
CREATE INDEX idx_attendance_registration ON attendance(registration_id);
CREATE INDEX idx_feedback_registration ON feedback(registration_id);
```

## Data Constraints & Validation

1. **Duplicate Prevention**: Unique constraint on (event_id, student_id) in registrations
2. **Capacity Limits**: Application-level validation for max_capacity
3. **Rating Bounds**: Database constraint ensures ratings are 1-5
4. **Temporal Validation**: Application ensures end_datetime > start_datetime
5. **Status Validation**: Enum-like constraints on status fields

## Edge Cases Handled

1. **Duplicate Registrations**: Prevented by unique constraint
2. **Missing Feedback**: Nullable feedback allows optional submission
3. **Cancelled Events**: Status field maintains data integrity
4. **Cross-College Students**: Students linked to specific colleges
5. **Event Capacity**: Tracked but not enforced at DB level (business logic)

## Sample Queries

### Event Popularity
```sql
SELECT e.title, e.event_type, COUNT(r.id) as registration_count
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
WHERE e.status = 'active'
GROUP BY e.id
ORDER BY registration_count DESC;
```

### Student Participation
```sql
SELECT s.name, s.email, COUNT(a.id) as events_attended
FROM students s
JOIN registrations r ON s.id = r.student_id
JOIN attendance a ON r.id = a.registration_id
GROUP BY s.id
ORDER BY events_attended DESC;
```

### Attendance Rate
```sql
SELECT e.title,
       COUNT(r.id) as total_registrations,
       COUNT(a.id) as total_attendance,
       ROUND(COUNT(a.id) * 100.0 / COUNT(r.id), 2) as attendance_percentage
FROM events e
LEFT JOIN registrations r ON e.id = r.event_id
LEFT JOIN attendance a ON r.id = a.registration_id
GROUP BY e.id;
```