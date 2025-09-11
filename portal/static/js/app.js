// Campus Event Management Platform - Frontend JavaScript

class EventManagementApp {
    constructor() {
        this.baseURL = '/api';
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadDashboard();
        this.setupEventListeners();
    }

    // Navigation
    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const section = btn.dataset.section;
                this.showSection(section);
            });
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        this.currentSection = sectionName;

        // Load section content
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'events':
                this.loadEvents();
                break;
            case 'students':
                this.loadStudents();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'create-event':
                this.loadColleges();
                break;
        }
    }

    // API Calls
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            this.showAlert('error', error.message);
            throw error;
        }
    }

    // Dashboard
    async loadDashboard() {
        try {
            this.showLoading('dashboard-content');

            // Load statistics
            const [colleges, students, events, reports] = await Promise.all([
                this.apiCall('/colleges'),
                this.apiCall('/students'),
                this.apiCall('/events'),
                this.apiCall('/reports/popularity')
            ]);

            const dashboardHTML = `
                <div class="stats">
                    <div class="stat-card">
                        <span class="stat-number">${colleges.data.length}</span>
                        <span class="stat-label">Colleges</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${students.data.length}</span>
                        <span class="stat-label">Students</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${events.data.length}</span>
                        <span class="stat-label">Events</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.getTotalRegistrations(reports.data)}</span>
                        <span class="stat-label">Total Registrations</span>
                    </div>
                </div>

                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Events</h3>
                        </div>
                        <div class="recent-events">
                            ${this.renderRecentEvents(events.data.slice(0, 5))}
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Quick Actions</h3>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 1rem;">
                            <button class="btn btn-primary" onclick="app.showSection('create-event')">
                                Create New Event
                            </button>
                            <button class="btn btn-outline" onclick="app.showSection('reports')">
                                View Reports
                            </button>
                            <button class="btn btn-outline" onclick="app.showSection('students')">
                                Manage Students
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('dashboard-content').innerHTML = dashboardHTML;
        } catch (error) {
            document.getElementById('dashboard-content').innerHTML = '<p class="alert alert-error">Failed to load dashboard</p>';
        }
    }

    getTotalRegistrations(events) {
        return events.reduce((total, event) => total + (event.total_registrations || 0), 0);
    }

    renderRecentEvents(events) {
        if (events.length === 0) {
            return '<p class="text-gray-500">No events found</p>';
        }

        return events.map(event => `
            <div class="event-card" style="margin-bottom: 1rem; padding: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: var(--dark-color);">${event.title}</h4>
                <div style="font-size: 0.9rem; color: var(--text-light);">
                    <div>📅 ${new Date(event.start_datetime).toLocaleDateString()}</div>
                    <div>🏫 ${event.college_name}</div>
                    <div>🎯 ${event.event_type}</div>
                </div>
            </div>
        `).join('');
    }

    // Events
    async loadEvents() {
        try {
            this.showLoading('events-content');

            const events = await this.apiCall('/events');
            const colleges = await this.apiCall('/colleges');

            const eventsHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">All Events</h3>
                        <div style="margin-top: 1rem;">
                            <select id="college-filter" class="form-select" style="max-width: 300px;">
                                <option value="">All Colleges</option>
                                ${colleges.data.map(college => `<option value="${college.id}">${college.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div id="events-list">
                        ${this.renderEvents(events.data)}
                    </div>
                </div>
            `;

            document.getElementById('events-content').innerHTML = eventsHTML;

            // Setup filter
            document.getElementById('college-filter').addEventListener('change', (e) => {
                this.filterEvents(e.target.value);
            });

        } catch (error) {
            document.getElementById('events-content').innerHTML = '<p class="alert alert-error">Failed to load events</p>';
        }
    }

    async filterEvents(collegeId) {
        try {
            const endpoint = collegeId ? `/events?college_id=${collegeId}` : '/events';
            const events = await this.apiCall(endpoint);
            document.getElementById('events-list').innerHTML = this.renderEvents(events.data);
        } catch (error) {
            console.error('Filter error:', error);
        }
    }

    renderEvents(events) {
        if (events.length === 0) {
            return '<p class="alert alert-warning">No events found</p>';
        }

        return events.map(event => `
            <div class="event-card">
                <div class="event-title">${event.title}</div>
                <div class="event-meta">
                    <span>📅 ${new Date(event.start_datetime).toLocaleDateString()}</span>
                    <span>⏰ ${new Date(event.start_datetime).toLocaleTimeString()}</span>
                    <span>🏫 ${event.college_name}</span>
                    <span>📍 ${event.location}</span>
                    <span class="badge badge-primary">${event.event_type}</span>
                </div>
                <div class="event-description">${event.description}</div>
                <div class="event-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.showRegistrationModal('${event.id}')">
                        Register Student
                    </button>
                    <button class="btn btn-success btn-sm" onclick="app.showCheckinModal('${event.id}')">
                        Mark Attendance
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="app.showFeedbackModal('${event.id}')">
                        Submit Feedback
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Students
    async loadStudents() {
        try {
            this.showLoading('students-content');

            const students = await this.apiCall('/students');
            const colleges = await this.apiCall('/colleges');

            const studentsHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">All Students</h3>
                        <div style="margin-top: 1rem;">
                            <select id="student-college-filter" class="form-select" style="max-width: 300px;">
                                <option value="">All Colleges</option>
                                ${colleges.data.map(college => `<option value="${college.id}">${college.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Student ID</th>
                                    <th>College</th>
                                    <th>Phone</th>
                                </tr>
                            </thead>
                            <tbody id="students-table-body">
                                ${this.renderStudentsTable(students.data)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.getElementById('students-content').innerHTML = studentsHTML;

            // Setup filter
            document.getElementById('student-college-filter').addEventListener('change', (e) => {
                this.filterStudents(e.target.value);
            });

        } catch (error) {
            document.getElementById('students-content').innerHTML = '<p class="alert alert-error">Failed to load students</p>';
        }
    }

    async filterStudents(collegeId) {
        try {
            const endpoint = collegeId ? `/students?college_id=${collegeId}` : '/students';
            const students = await this.apiCall(endpoint);
            document.getElementById('students-table-body').innerHTML = this.renderStudentsTable(students.data);
        } catch (error) {
            console.error('Filter error:', error);
        }
    }

    renderStudentsTable(students) {
        if (students.length === 0) {
            return '<tr><td colspan="5" class="text-center">No students found</td></tr>';
        }

        return students.map(student => `
            <tr>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.student_id}</td>
                <td>${student.college_name}</td>
                <td>${student.phone || 'N/A'}</td>
            </tr>
        `).join('');
    }

    // Reports
    async loadReports() {
        try {
            this.showLoading('reports-content');

            const [popularity, participation, topStudents, attendance] = await Promise.all([
                this.apiCall('/reports/popularity'),
                this.apiCall('/reports/participation'),
                this.apiCall('/reports/top-students'),
                this.apiCall('/reports/attendance')
            ]);

            const reportsHTML = `
                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Event Popularity</h3>
                        </div>
                        ${this.renderPopularityReport(popularity.data)}
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Top Active Students</h3>
                        </div>
                        ${this.renderTopStudents(topStudents.data)}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Attendance Analytics</h3>
                    </div>
                    ${this.renderAttendanceReport(attendance.data)}
                </div>
            `;

            document.getElementById('reports-content').innerHTML = reportsHTML;
        } catch (error) {
            document.getElementById('reports-content').innerHTML = '<p class="alert alert-error">Failed to load reports</p>';
        }
    }

    renderPopularityReport(events) {
        if (events.length === 0) {
            return '<p>No events found</p>';
        }

        return `
            <table class="table">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Type</th>
                        <th>College</th>
                        <th>Registrations</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.slice(0, 10).map(event => `
                        <tr>
                            <td>${event.title}</td>
                            <td><span class="badge badge-primary">${event.event_type}</span></td>
                            <td>${event.college_name}</td>
                            <td><strong>${event.total_registrations}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderTopStudents(students) {
        if (students.length === 0) {
            return '<p>No active students found</p>';
        }

        return `
            <table class="table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Student</th>
                        <th>College</th>
                        <th>Events Attended</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map((student, index) => `
                        <tr>
                            <td><strong>#${index + 1}</strong></td>
                            <td>${student.name}</td>
                            <td>${student.college_name}</td>
                            <td><span class="badge badge-success">${student.events_attended}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderAttendanceReport(events) {
        if (events.length === 0) {
            return '<p>No attendance data found</p>';
        }

        return `
            <table class="table">
                <thead>
                    <tr>
                        <th>Event</th>
                        <th>Registrations</th>
                        <th>Attendance</th>
                        <th>Attendance Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.slice(0, 10).map(event => `
                        <tr>
                            <td>${event.title}</td>
                            <td>${event.total_registrations}</td>
                            <td>${event.total_attendance}</td>
                            <td>
                                <span class="badge ${this.getAttendanceBadgeClass(event.attendance_percentage)}">
                                    ${event.attendance_percentage}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    getAttendanceBadgeClass(percentage) {
        if (percentage >= 80) return 'badge-success';
        if (percentage >= 60) return 'badge-warning';
        return 'badge-danger';
    }

    // Event Creation
    async loadColleges() {
        try {
            const colleges = await this.apiCall('/colleges');
            const collegeSelect = document.getElementById('event-college');
            collegeSelect.innerHTML = '<option value="">Select College</option>' +
                colleges.data.map(college => `<option value="${college.id}">${college.name}</option>`).join('');
        } catch (error) {
            console.error('Failed to load colleges:', error);
        }
    }

    setupEventListeners() {
        // Event creation form
        const createEventForm = document.getElementById('create-event-form');
        if (createEventForm) {
            createEventForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCreateEvent(e.target);
            });
        }
    }

    async handleCreateEvent(form) {
        try {
            const formData = new FormData(form);
            const eventData = {
                title: formData.get('title'),
                description: formData.get('description'),
                event_type: formData.get('event_type'),
                college_id: parseInt(formData.get('college_id')),
                created_by: formData.get('created_by'),
                start_datetime: formData.get('start_datetime'),
                end_datetime: formData.get('end_datetime'),
                location: formData.get('location'),
                max_capacity: parseInt(formData.get('max_capacity')) || 0
            };

            await this.apiCall('/events', 'POST', eventData);
            this.showAlert('success', 'Event created successfully!');
            form.reset();
            this.showSection('events');
        } catch (error) {
            this.showAlert('error', 'Failed to create event: ' + error.message);
        }
    }

    // Modals and Interactions
    showRegistrationModal(eventId) {
        const email = prompt('Enter student email for registration:');
        if (email) {
            this.registerStudent(eventId, email);
        }
    }

    showCheckinModal(eventId) {
        const email = prompt('Enter student email for check-in:');
        if (email) {
            this.checkinStudent(eventId, email);
        }
    }

    showFeedbackModal(eventId) {
        const email = prompt('Enter student email:');
        if (email) {
            const rating = prompt('Enter rating (1-5):');
            const comments = prompt('Enter comments (optional):') || '';
            if (rating && rating >= 1 && rating <= 5) {
                this.submitFeedback(eventId, email, parseInt(rating), comments);
            } else {
                this.showAlert('error', 'Invalid rating. Please enter a number between 1-5.');
            }
        }
    }

    async registerStudent(eventId, email) {
        try {
            await this.apiCall(`/events/${eventId}/register`, 'POST', { student_email: email });
            this.showAlert('success', 'Student registered successfully!');
        } catch (error) {
            this.showAlert('error', 'Registration failed: ' + error.message);
        }
    }

    async checkinStudent(eventId, email) {
        try {
            await this.apiCall(`/events/${eventId}/checkin`, 'POST', { student_email: email });
            this.showAlert('success', 'Attendance marked successfully!');
        } catch (error) {
            this.showAlert('error', 'Check-in failed: ' + error.message);
        }
    }

    async submitFeedback(eventId, email, rating, comments) {
        try {
            await this.apiCall(`/events/${eventId}/feedback`, 'POST', {
                student_email: email,
                rating: rating,
                comments: comments
            });
            this.showAlert('success', 'Feedback submitted successfully!');
        } catch (error) {
            this.showAlert('error', 'Feedback submission failed: ' + error.message);
        }
    }

    // Utility functions
    showLoading(containerId) {
        document.getElementById(containerId).innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                Loading...
            </div>
        `;
    }

    showAlert(type, message) {
        const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
        const alertHTML = `<div class="alert ${alertClass}">${message}</div>`;
        
        // Create or update alerts container
        let alertsContainer = document.getElementById('alerts-container');
        if (!alertsContainer) {
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'alerts-container';
            alertsContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000; max-width: 400px;';
            document.body.appendChild(alertsContainer);
        }

        const alertElement = document.createElement('div');
        alertElement.innerHTML = alertHTML;
        alertsContainer.appendChild(alertElement);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alertElement.remove();
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EventManagementApp();
});


