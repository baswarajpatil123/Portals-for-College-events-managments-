# API Design Documentation

## Overview

The Campus Event Management Platform provides RESTful APIs for managing events, registrations, attendance, and generating reports.

**Base URL**: `http://localhost:5000/api`

## Authentication

*Note: For this prototype, authentication is simplified. In production, implement proper JWT/OAuth authentication.*

## Response Format

All endpoints return JSON in the following format:

```json
{
  "success": true|false,
  "message": "Description of result",
  "data": {} // Optional, contains response data
}
```

## Event Management Endpoints

### Create Event
- **POST** `/events`
- **Description**: Create a new event
- **Request Body**:
```json
{
  "title": "AI/ML Workshop",
  "description": "Learn machine learning basics",
  "event_type": "workshop",
  "college_id": 1,
  "created_by": "staff@college.edu",
  "start_datetime": "2025-09-17 10:00:00",
  "end_datetime": "2025-09-17 14:00:00",
  "location": "Lab 101",
  "max_capacity": 50
}
```

### Get Events
- **GET** `/events`
- **Description**: Retrieve all events with optional filtering
- **Query Parameters**:
  - `college_id` (optional): Filter by college
  - `event_type` (optional): Filter by event type

### Get Single Event
- **GET** `/events/{event_id}`
- **Description**: Get detailed information about a specific event

## Registration Endpoints

### Register for Event
- **POST** `/events/{event_id}/register`
- **Description**: Register a student for an event
- **Request Body**:
```json
{
  "student_email": "student@college.edu"
}
```

### Mark Attendance
- **POST** `/events/{event_id}/checkin`
- **Description**: Mark student attendance at an event
- **Request Body**:
```json
{
  "student_email": "student@college.edu"
}
```

### Submit Feedback
- **POST** `/events/{event_id}/feedback`
- **Description**: Submit feedback for an attended event
- **Request Body**:
```json
{
  "student_email": "student@college.edu",
  "rating": 5,
  "comments": "Excellent workshop!"
}
```

## Reporting Endpoints

### Event Popularity Report
- **GET** `/reports/popularity`
- **Description**: Get events sorted by registration count
- **Query Parameters**:
  - `event_type` (optional): Filter by event type
  - `college_id` (optional): Filter by college

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Hackathon 2025",
      "event_type": "hackathon",
      "college_name": "MIT College",
      "total_registrations": 75,
      "max_capacity": 100
    }
  ]
}
```

### Student Participation Report
- **GET** `/reports/participation`
- **Description**: Get student activity across events
- **Query Parameters**:
  - `college_id` (optional): Filter by college

### Attendance Analytics
- **GET** `/reports/attendance`
- **Description**: Get attendance rates per event

### Feedback Summary
- **GET** `/reports/feedback`
- **Description**: Get feedback summary with ratings distribution

### Top Active Students
- **GET** `/reports/top-students`
- **Description**: Get most active students
- **Query Parameters**:
  - `limit` (optional, default=3): Number of students to return

### College Summary
- **GET** `/reports/colleges`
- **Description**: Get college-wise summary statistics

## Utility Endpoints

### Get Colleges
- **GET** `/colleges`
- **Description**: Retrieve all colleges

### Get Students
- **GET** `/students`
- **Description**: Retrieve students with optional college filter
- **Query Parameters**:
  - `college_id` (optional): Filter by college

### Health Check
- **GET** `/health`
- **Description**: Check API health status

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

## Event Types

Supported event types:
- `workshop`
- `hackathon`
- `tech_talk`
- `fest`
- `seminar`

## Sample API Usage

### Complete Event Workflow

1. **Create Event**:
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Python Workshop",
    "event_type": "workshop",
    "college_id": 1,
    "created_by": "admin@college.edu",
    "start_datetime": "2025-10-15 10:00:00",
    "end_datetime": "2025-10-15 16:00:00",
    "location": "Lab 201",
    "max_capacity": 30
  }'
```

2. **Register Student**:
```bash
curl -X POST http://localhost:5000/api/events/{event_id}/register \
  -H "Content-Type: application/json" \
  -d '{"student_email": "alice@student.com"}'
```

3. **Mark Attendance**:
```bash
curl -X POST http://localhost:5000/api/events/{event_id}/checkin \
  -H "Content-Type: application/json" \
  -d '{"student_email": "alice@student.com"}'
```

4. **Submit Feedback**:
```bash
curl -X POST http://localhost:5000/api/events/{event_id}/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "student_email": "alice@student.com",
    "rating": 5,
    "comments": "Great workshop!"
  }'
```

5. **Get Reports**:
```bash
# Event popularity
curl http://localhost:5000/api/reports/popularity

# Student participation
curl http://localhost:5000/api/reports/participation

# Top active students
curl http://localhost:5000/api/reports/top-students?limit=5
```

## Rate Limiting

*Note: Not implemented in prototype. Consider adding rate limiting for production deployment.*

## Data Validation

- Email format validation
- Rating must be 1-5
- Event dates must be logical (end > start)
- Required fields validation
- Duplicate registration prevention





