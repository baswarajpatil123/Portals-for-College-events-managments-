// Admin Portal JavaScript

class AdminPortalApp {
    constructor() {
        this.baseURL = '/api';
        this.currentSection = 'admin-dashboard';
        this.currentCollege = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadAdminDashboard();
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
            case 'admin-dashboard':
                this.loadAdminDashboard();
                break;
            case 'manage-events':
                this.loadManageEvents();
                break;
            case 'create-event':
                this.loadCreateEvent();
                break;
            case 'student-management':
                this.loadStudentManagement();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'reports':
                this.loadReports();
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

    // Admin Dashboard
    async loadAdminDashboard() {
        try {
            // Load statistics
            const [events, students, colleges, popularity, attendance, feedback] = await Promise.all([
                this.apiCall('/events'),
                this.apiCall('/students'),
                this.apiCall('/colleges'),
                this.apiCall('/reports/popularity'),
                this.apiCall('/reports/attendance'),
                this.apiCall('/reports/feedback')
            ]);

            // Update stat cards
            document.getElementById('total-events').textContent = events.data.length;
            
            const totalRegistrations = popularity.data.reduce((sum, event) => sum + (event.total_registrations || 0), 0);
            document.getElementById('total-registrations').textContent = totalRegistrations;
            
            const totalAttendance = attendance.data.reduce((sum, event) => sum + (event.total_attendance || 0), 0);
            document.getElementById('total-attendance').textContent = totalAttendance;

            // Calculate average rating from feedback data
            const avgRating = this.calculateAverageRatingFromFeedback(feedback.data);
            document.getElementById('avg-rating').textContent = avgRating;

            // Load recent events
            this.renderRecentEvents(events.data.slice(0, 5));

        } catch (error) {
            console.error('Dashboard loading error:', error);
        }
    }

    calculateAverageRatingFromFeedback(feedbackData) {
        if (!feedbackData || feedbackData.length === 0) return 'N/A';
        
        // Calculate overall average rating from all feedback
        const totalRating = feedbackData.reduce((sum, feedback) => sum + parseFloat(feedback.average_rating || 0), 0);
        const eventCount = feedbackData.length;
        
        if (eventCount === 0) return 'N/A';
        
        return (totalRating / eventCount).toFixed(1);
    }

    calculateAverageRating(events) {
        const eventsWithRating = events.filter(e => e.average_rating);
        if (eventsWithRating.length === 0) return 'N/A';
        
        const total = eventsWithRating.reduce((sum, e) => sum + parseFloat(e.average_rating || 0), 0);
        return (total / eventsWithRating.length).toFixed(1);
    }

    renderRecentEvents(events) {
        const container = document.getElementById('recent-events-list');
        
        if (events.length === 0) {
            container.innerHTML = '<p class="admin-alert warning">No events found. Create your first event!</p>';
            return;
        }

        const eventsHTML = events.map(event => `
            <div class="admin-event-card">
                <div class="admin-event-header">
                    <div>
                        <h4 class="admin-event-title">${event.title}</h4>
                        <span class="admin-event-status ${event.status || 'active'}">${event.status || 'active'}</span>
                    </div>
                </div>
                <div class="admin-event-meta">
                    <div>📅 ${new Date(event.start_datetime).toLocaleDateString()}</div>
                    <div>🏫 ${event.college_name}</div>
                    <div>🎯 ${event.event_type}</div>
                    <div>📍 ${event.location}</div>
                </div>
                <div class="admin-event-actions">
                    <button class="btn btn-primary btn-sm" onclick="adminApp.viewEventDetails('${event.id}')">
                        View Details
                    </button>
                    <button class="btn btn-success btn-sm" onclick="adminApp.manageRegistrations('${event.id}')">
                        Registrations
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    // Manage Events
    async loadManageEvents() {
        try {
            // Show loading state
            this.showLoading('admin-events-content');
            
            // Fetch all events
            const events = await this.apiCall('/events');
            
            if (events.success) {
                // Clear any existing subsections
                this.clearEventSubsections();
                
                // Setup the new event management system
                this.setupEventManagementSystem(events.data);
                
                // Setup filters
                this.setupEventFilters();
                
            } else {
                document.getElementById('admin-events-content').innerHTML = 
                    '<p class="admin-alert error">Failed to load events</p>';
            }
        } catch (error) {
            console.error('Error loading events:', error);
            document.getElementById('admin-events-content').innerHTML = 
                '<p class="admin-alert error">Failed to load events</p>';
        }
    }

    clearEventSubsections() {
        const content = document.getElementById('admin-events-content');
        if (content) {
            content.innerHTML = '';
        }
    }

    setupEventManagementSystem(events) {
        // Categorize events by status and timing
        const categorizedEvents = this.categorizeEvents(events);
        
        // Create the event management interface
        this.createEventManagementInterface(categorizedEvents);
        
        // Setup event handlers
        this.setupEventManagementHandlers(categorizedEvents);
        
        // Load initial view (Upcoming Events)
        this.loadEventSection('upcoming', categorizedEvents);
    }

    categorizeEvents(events) {
        const now = new Date();
        const categorized = {
            upcoming: { active: [], cancelled: [] },
            past: { completed: [], cancelled: [] }
        };

        events.forEach(event => {
            const eventStart = new Date(event.start_datetime);
            const isUpcoming = eventStart > now;

            if (isUpcoming) {
                // Handle upcoming events
                if (event.status === 'active') {
                    categorized.upcoming.active.push(event);
                } else if (event.status === 'cancelled') {
                    categorized.upcoming.cancelled.push(event);
                }
            } else {
                // Handle past events
                if (event.status === 'completed') {
                    categorized.past.completed.push(event);
                } else if (event.status === 'cancelled') {
                    categorized.past.cancelled.push(event);
                } else if (event.status === 'active') {
                    // An active event whose start time has passed is functionally "completed" from a UI perspective.
                    // The UI for Past Events correctly shows this as 'Completed' via getEventStatusInfo().
                    categorized.past.completed.push(event);
                }
            }
        });

        return categorized;
    }

    createEventManagementInterface(categorizedEvents) {
        const content = document.getElementById('admin-events-content');
        
        const interfaceHTML = `
            <div class="event-management-system">
                <div class="event-section-tabs">
                    <button class="section-tab active" data-section="upcoming">
                        🔮 Upcoming Events
                        <span class="event-count">(${this.getUpcomingCount(categorizedEvents)})</span>
                    </button>
                    <button class="section-tab" data-section="past">
                        📅 Past Events
                        <span class="event-count">(${this.getPastCount(categorizedEvents)})</span>
                    </button>
                </div>
                
                <div class="event-section-content">
                    <div id="event-section-display">
                        <!-- Events will be displayed here -->
                    </div>
                </div>
            </div>
        `;
        
        content.innerHTML = interfaceHTML;
    }

    getUpcomingCount(categorizedEvents) {
        return categorizedEvents.upcoming.active.length + categorizedEvents.upcoming.cancelled.length;
    }

    getPastCount(categorizedEvents) {
        return categorizedEvents.past.completed.length + categorizedEvents.past.cancelled.length;
    }

    setupEventManagementHandlers(categorizedEvents) {
        // Setup section tab handlers
        const sectionTabs = document.querySelectorAll('.section-tab');
        sectionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs
                sectionTabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Load the selected section
                const section = tab.dataset.section;
                this.loadEventSection(section, categorizedEvents);
                
                // Update status filter options
                this.updateStatusFilterForSection(section);
            });
        });
    }

    loadEventSection(section, categorizedEvents) {
        const display = document.getElementById('event-section-display');
        
        if (section === 'upcoming') {
            this.displayUpcomingEvents(categorizedEvents.upcoming, display);
        } else if (section === 'past') {
            this.displayPastEvents(categorizedEvents.past, display);
        }
    }

    displayUpcomingEvents(upcomingEvents, container) {
        const allUpcoming = [...upcomingEvents.active, ...upcomingEvents.cancelled];
        
        if (allUpcoming.length === 0) {
            container.innerHTML = `
                <div class="no-events-message">
                    <div class="no-events-icon">🔮</div>
                    <h3>No Upcoming Events</h3>
                    <p>There are no upcoming events scheduled.</p>
                    <button class="btn btn-primary" onclick="adminApp.showSection('create-event')">
                        Create New Event
                    </button>
                </div>
            `;
            return;
        }

        // Create status tabs for upcoming events
        const statusTabsHTML = `
            <div class="status-tabs">
                <button class="status-tab active" data-status="all">
                    All Upcoming (${allUpcoming.length})
                </button>
                <button class="status-tab" data-status="active">
                    🟢 Active (${upcomingEvents.active.length})
                </button>
                <button class="status-tab" data-status="cancelled">
                    🔴 Cancelled (${upcomingEvents.cancelled.length})
                </button>
            </div>
        `;

        // Create events list
        const eventsHTML = this.renderEventsList(allUpcoming, 'upcoming', 'all');
        
        container.innerHTML = statusTabsHTML + eventsHTML;
        
        // Setup status tab handlers
        this.setupStatusTabHandlers(upcomingEvents, 'upcoming');
    }

    displayPastEvents(pastEvents, container) {
        const allPast = [...pastEvents.completed, ...pastEvents.cancelled];
        
        if (allPast.length === 0) {
            container.innerHTML = `
                <div class="no-events-message">
                    <div class="no-events-icon">📅</div>
                    <h3>No Past Events</h3>
                    <p>There are no past events in the system.</p>
                </div>
            `;
            return;
        }

        // Create status tabs for past events
        const statusTabsHTML = `
            <div class="status-tabs">
                <button class="status-tab active" data-status="all">
                    All Past (${allPast.length})
                </button>
                <button class="status-tab" data-status="completed">
                    ✅ Completed (${pastEvents.completed.length})
                </button>
                <button class="status-tab" data-status="cancelled">
                    🔴 Cancelled (${pastEvents.cancelled.length})
                </button>
            </div>
        `;

        // Create events list
        const eventsHTML = this.renderEventsList(allPast, 'past', 'all');
        
        container.innerHTML = statusTabsHTML + eventsHTML;
        
        // Setup status tab handlers
        this.setupStatusTabHandlers(pastEvents, 'past');
    }

    renderEventsList(events, section, status = null) {
        if (events.length === 0) {
            let message = "No events match the current filter.";
            let icon = "📝";
            let title = "No Events Found";
            
            // Provide more specific messages based on status
            if (status === 'cancelled') {
                title = "No Cancelled Events";
                message = "There are no cancelled events in this section.";
                icon = "✅";
            } else if (status === 'active') {
                title = "No Active Events";
                message = "There are no active events in this section.";
                icon = "🟢";
            } else if (status === 'completed') {
                title = "No Completed Events";
                message = "There are no completed events in this section.";
                icon = "📅";
            }
            
            return `
                <div class="no-events-message">
                    <div class="no-events-icon">${icon}</div>
                    <h3>${title}</h3>
                    <p>${message}</p>
                </div>
            `;
        }

        const eventsHTML = events.map(event => this.renderEventCard(event, section)).join('');
        
        return `
            <div class="events-grid">
                ${eventsHTML}
            </div>
        `;
    }

    renderEventCard(event, section) {
        const eventStart = new Date(event.start_datetime);
        const eventEnd = new Date(event.end_datetime);
        const now = new Date();
        
        // Determine event status and actions
        const statusInfo = this.getEventStatusInfo(event, section);
        const actions = this.getEventActions(event, section);
        
        return `
            <div class="event-card ${statusInfo.class}" data-event-id="${event.id}">
                <div class="event-card-header">
                    <div class="event-title">
                        <h4>${event.title}</h4>
                        <span class="event-type-badge">${this.getEventTypeIcon(event.event_type)} ${event.event_type}</span>
                    </div>
                    <div class="event-status">
                        ${statusInfo.icon} ${statusInfo.text}
                    </div>
                </div>
                
                <div class="event-card-body">
                    <div class="event-meta">
                        <div class="meta-item">
                            <span class="meta-label">📅 Date:</span>
                            <span class="meta-value">${eventStart.toLocaleDateString()}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">🕐 Time:</span>
                            <span class="meta-value">${eventStart.toLocaleTimeString()} - ${eventEnd.toLocaleTimeString()}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">📍 Location:</span>
                            <span class="meta-value">${event.location}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">🏫 College:</span>
                            <span class="meta-value">${event.college_name}</span>
                        </div>
                    </div>
                    
                    ${event.description ? `
                        <div class="event-description">
                            <p>${event.description}</p>
                        </div>
                    ` : ''}
                    
                    <div class="event-stats">
                        <div class="stat-item">
                            <span class="stat-label">Capacity:</span>
                            <span class="stat-value">${event.max_capacity || 'Unlimited'}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Registrations:</span>
                            <span class="stat-value">${event.total_registrations || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="event-card-actions">
                    ${actions}
                </div>
            </div>
        `;
    }

    getEventStatusInfo(event, section) {
        const now = new Date();
        const eventStart = new Date(event.start_datetime);
        const eventEnd = new Date(event.end_datetime);
        
        if (event.status === 'cancelled') {
            return {
                icon: '🔴',
                text: 'Cancelled',
                class: 'cancelled'
            };
        } else if (event.status === 'completed') {
            return {
                icon: '✅',
                text: 'Completed',
                class: 'completed'
            };
        } else if (event.status === 'active') {
            if (eventStart > now) {
                return {
                    icon: '🟢',
                    text: 'Active (Upcoming)',
                    class: 'active-upcoming'
                };
            } else if (eventEnd > now) {
                return {
                    icon: '🟡',
                    text: 'Active (Ongoing)',
                    class: 'active-ongoing'
                };
            } else {
                return {
                    icon: '✅',
                    text: 'Completed',
                    class: 'completed'
                };
            }
        }
        
        return {
            icon: '❓',
            text: 'Unknown',
            class: 'unknown'
        };
    }

    getEventActions(event, section) {
        const now = new Date();
        const eventStart = new Date(event.start_datetime);
        const eventEnd = new Date(event.end_datetime);
        
        let actions = '';
        
        // Cancel Event (only for active upcoming events)
        if (event.status === 'active' && eventStart > now) {
            actions += `
                <button class="btn btn-danger btn-sm" onclick="adminApp.cancelEvent('${event.id}', '${event.title}')">
                    🚫 Cancel Event
                </button>
            `;
        }
        
        // Reschedule Event (only for cancelled events)
        if (event.status === 'cancelled') {
            actions += `
                <button class="btn btn-warning btn-sm" onclick="adminApp.rescheduleEvent('${event.id}', '${event.title}')">
                    📅 Reschedule
                </button>
            `;
        }
        
        // Edit Date/Time (only for active upcoming events)
        if (event.status === 'active' && eventStart > now) {
            actions += `
                <button class="btn btn-info btn-sm" onclick="adminApp.editEventDateTime('${event.id}', '${event.title}', '${event.start_datetime}', '${event.end_datetime}')">
                    ✏️ Edit Date/Time
                </button>
            `;
        }
        
        // View Details (always available)
        actions += `
            <button class="btn btn-outline btn-sm" onclick="adminApp.viewEventDetails('${event.id}')">
                👁️ View Details
            </button>
        `;
        
        return actions;
    }

    setupStatusTabHandlers(events, section) {
        const statusTabs = document.querySelectorAll('.status-tab');
        statusTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all status tabs
                statusTabs.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                tab.classList.add('active');
                
                // Filter events based on status
                const status = tab.dataset.status;
                this.filterEventsByStatus(events, status, section);
            });
        });
    }

    filterEventsByStatus(events, status, section) {
        let filteredEvents = [];
        
        if (section === 'upcoming') {
            if (status === 'all') {
                filteredEvents = [...events.active, ...events.cancelled];
            } else if (status === 'active') {
                filteredEvents = events.active;
            } else if (status === 'cancelled') {
                filteredEvents = events.cancelled;
            }
        } else if (section === 'past') {
            if (status === 'all') {
                filteredEvents = [...events.completed, ...events.cancelled];
            } else if (status === 'completed') {
                filteredEvents = events.completed;
            } else if (status === 'cancelled') {
                filteredEvents = events.cancelled;
            }
        }
        
        // Update the events display
        const eventsGrid = document.querySelector('.events-grid');
        if (eventsGrid) {
            eventsGrid.innerHTML = this.renderEventsList(filteredEvents, section, status);
        }
    }

    updateStatusFilterForSection(section) {
        const statusFilter = document.getElementById('event-status-filter');
        if (!statusFilter) return;
        
        // Clear existing options
        statusFilter.innerHTML = '';
        
        if (section === 'upcoming') {
            statusFilter.innerHTML = `
                <option value="">All Upcoming</option>
                <option value="active">🟢 Active</option>
                <option value="cancelled">🔴 Cancelled</option>
            `;
        } else if (section === 'past') {
            statusFilter.innerHTML = `
                <option value="">All Past</option>
                <option value="completed">✅ Completed</option>
                <option value="cancelled">🔴 Cancelled</option>
            `;
        }
        
        // Reset to first option
        statusFilter.selectedIndex = 0;
    }

    getEventTypeIcon(eventType) {
        const icons = {
            'workshop': '🔧',
            'hackathon': '💻',
            'tech_talk': '🎤',
            'fest': '🎉',
            'seminar': '📚'
        };
        return icons[eventType] || '📅';
    }

    setupEventFilters() {
        const statusFilter = document.getElementById('event-status-filter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    applyFilters() {
        // This will be called when filters change
        // For now, we'll reload the events to apply filters
        this.loadManageEvents();
    }


    renderManageEvents(events) {
        const container = document.getElementById('admin-events-list');
        
        if (events.length === 0) {
            container.innerHTML = '<p class="admin-alert warning">No events match the current filters.</p>';
            return;
        }

        const eventsHTML = events.map(event => {
            const now = new Date();
            const eventStart = new Date(event.start_datetime);
            const canCancel = event.status === 'active' && eventStart > now;
            
            const statusClass = event.status === 'active' ? 'active' : 
                               event.status === 'cancelled' ? 'cancelled' : 'completed';
            
            const statusIcon = event.status === 'active' ? '🟢' : 
                              event.status === 'cancelled' ? '🔴' : '✅';
            
            return `
                <div class="admin-event-card">
                    <div class="admin-event-header">
                        <div>
                            <h4 class="admin-event-title">${event.title}</h4>
                            <p style="color: #6b7280; font-size: 0.9rem; margin: 0.25rem 0;">${event.description}</p>
                        </div>
                        <span class="admin-event-status ${statusClass}">
                            ${statusIcon} ${event.status || 'active'}
                        </span>
                    </div>
                    <div class="admin-event-meta">
                        <div><strong>📅 Start:</strong> ${new Date(event.start_datetime).toLocaleString()}</div>
                        <div><strong>📅 End:</strong> ${new Date(event.end_datetime).toLocaleString()}</div>
                        <div><strong>🏫 College:</strong> ${event.college_name}</div>
                        <div><strong>📍 Location:</strong> ${event.location}</div>
                        <div><strong>🎯 Type:</strong> ${event.event_type}</div>
                        <div><strong>👥 Capacity:</strong> ${event.max_capacity || 'Unlimited'}</div>
                    </div>
                    <div class="admin-event-actions">
                        <button class="btn btn-primary btn-sm" onclick="adminApp.viewEventDetails('${event.id}')">
                            📊 Details
                        </button>
                        <button class="btn btn-success btn-sm" onclick="adminApp.manageRegistrations('${event.id}')">
                            📝 Registrations
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="adminApp.manageAttendance('${event.id}')">
                            ✅ Attendance
                        </button>
                        <button class="btn btn-info btn-sm" onclick="adminApp.viewFeedback('${event.id}')">
                            ⭐ Feedback
                        </button>
                        ${canCancel ? `
                            <button class="btn btn-danger btn-sm" onclick="adminApp.cancelEvent('${event.id}', '${event.title}')">
                                🚫 Cancel Event
                            </button>
                        ` : ''}
                        ${event.status === 'cancelled' ? `
                            <button class="btn btn-warning btn-sm" onclick="adminApp.rescheduleEvent('${event.id}', '${event.title}')">
                                📅 Reschedule
                            </button>
                        ` : ''}
                        ${canCancel ? `
                            <button class="btn btn-info btn-sm" onclick="adminApp.editEventDateTime('${event.id}', '${event.title}', '${event.start_datetime}', '${event.end_datetime}')">
                                ✏️ Edit Date/Time
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = eventsHTML;
    }

    // Create Event
    async loadCreateEvent() {
        try {
            const colleges = await this.apiCall('/colleges');
            const collegeSelect = document.getElementById('admin-event-college');
            
            if (collegeSelect) {
                collegeSelect.innerHTML = '<option value="">Select College</option>' +
                    colleges.data.map(college => 
                        `<option value="${college.id}">${college.name}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Failed to load colleges:', error);
        }
    }

    // Student Management
    async loadStudentManagement() {
        try {
            this.showLoading('admin-students-content');
            
            const [students, colleges] = await Promise.all([
                this.apiCall('/students'),
                this.apiCall('/colleges')
            ]);
            
            // Setup college filter
            const collegeFilter = document.getElementById('admin-student-college-filter');
            if (collegeFilter) {
                collegeFilter.innerHTML = '<option value="">All Colleges</option>' +
                    colleges.data.map(college => 
                        `<option value="${college.id}">${college.name}</option>`
                    ).join('');
                
                collegeFilter.addEventListener('change', (e) => {
                    this.filterStudents(e.target.value, students.data);
                });
            }
            
            // Setup search
            const searchInput = document.getElementById('student-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.searchStudents(e.target.value, students.data);
                });
            }
            
            this.renderStudentTable(students.data);
            
        } catch (error) {
            document.getElementById('admin-students-content').innerHTML = 
                '<p class="admin-alert error">Failed to load students</p>';
        }
    }

    filterStudents(collegeId, allStudents) {
        const filteredStudents = collegeId ? 
            allStudents.filter(s => s.college_id == collegeId) : 
            allStudents;
        this.renderStudentTable(filteredStudents);
    }

    searchStudents(searchTerm, allStudents) {
        const filteredStudents = searchTerm ? 
            allStudents.filter(s => 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
            ) : allStudents;
        this.renderStudentTable(filteredStudents);
    }

    renderStudentTable(students) {
        const container = document.getElementById('admin-students-content');
        
        if (students.length === 0) {
            container.innerHTML = '<p class="admin-alert warning">No students found.</p>';
            return;
        }

        const tableHTML = `
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Student ID</th>
                            <th>College</th>
                            <th>Phone</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => `
                            <tr>
                                <td>${student.name}</td>
                                <td>${student.email}</td>
                                <td>${student.student_id}</td>
                                <td>${student.college_name}</td>
                                <td>${student.phone || 'N/A'}</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="adminApp.viewStudentProfile('${student.id}')">
                                        View Profile
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    // Analytics
    async loadAnalytics() {
        try {
            this.showLoading('admin-analytics-content');
            
            const [popularity, participation, attendance, feedback] = await Promise.all([
                this.apiCall('/reports/popularity'),
                this.apiCall('/reports/participation'),
                this.apiCall('/reports/attendance'),
                this.apiCall('/reports/feedback')
            ]);

            const analyticsHTML = `
                <div class="grid grid-2">
                    <div class="chart-container">
                        <h3 class="chart-title">📈 Event Popularity Trends</h3>
                        ${this.renderPopularityChart(popularity.data)}
                    </div>
                    <div class="chart-container">
                        <h3 class="chart-title">✅ Attendance Rates</h3>
                        ${this.renderAttendanceChart(attendance.data)}
                    </div>
                </div>
                
                <div class="chart-container">
                    <h3 class="chart-title">👥 Student Engagement Overview</h3>
                    ${this.renderEngagementOverview(participation.data)}
                </div>
                
                <div class="chart-container">
                    <h3 class="chart-title">⭐ Feedback Summary</h3>
                    ${this.renderFeedbackSummary(feedback.data)}
                </div>
            `;

            document.getElementById('admin-analytics-content').innerHTML = analyticsHTML;
            
        } catch (error) {
            document.getElementById('admin-analytics-content').innerHTML = 
                '<p class="admin-alert error">Failed to load analytics</p>';
        }
    }

    renderPopularityChart(events) {
        if (events.length === 0) return '<p>No event data available</p>';
        
        const maxRegistrations = Math.max(...events.map(e => e.total_registrations));
        
        return `
            <div class="simple-chart">
                ${events.slice(0, 10).map((event, index) => `
                    <div class="chart-bar" style="height: ${Math.max(30, (event.total_registrations / maxRegistrations * 180))}px;">
                        <div class="chart-label">${event.title.substring(0, 12)}${event.title.length > 12 ? '...' : ''}</div>
                        <div class="chart-value">${event.total_registrations}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderAttendanceChart(events) {
        if (events.length === 0) return '<p>No attendance data available</p>';
        
        return `
            <div class="attendance-metrics">
                ${events.slice(0, 8).map(event => `
                    <div class="attendance-metric">
                        <div class="metric-header">
                            <span class="metric-title">${event.title.substring(0, 25)}${event.title.length > 25 ? '...' : ''}</span>
                            <span class="metric-percentage ${this.getAttendanceClass(event.attendance_percentage)}">${event.attendance_percentage}%</span>
                        </div>
                        <div class="metric-bar">
                            <div class="metric-fill ${this.getAttendanceClass(event.attendance_percentage)}" style="width: ${event.attendance_percentage}%"></div>
                        </div>
                        <div class="metric-details">
                            ${event.total_attendance}/${event.total_registrations} attended
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getAttendanceClass(percentage) {
        if (percentage >= 80) return 'high';
        if (percentage >= 60) return 'medium';
        return 'low';
    }

    renderEngagementOverview(students) {
        const activeStudents = students.filter(s => s.events_attended > 0);
        const totalAttendance = students.reduce((sum, s) => sum + s.events_attended, 0);
        const avgAttendance = totalAttendance / Math.max(students.length, 1);
        
        return `
            <div class="engagement-stats">
                <div class="stat-item">
                    <div class="stat-number">${activeStudents.length}</div>
                    <div class="stat-label">Active Students</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${students.length}</div>
                    <div class="stat-label">Total Students</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${avgAttendance.toFixed(1)}</div>
                    <div class="stat-label">Avg Events/Student</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${((activeStudents.length / Math.max(students.length, 1)) * 100).toFixed(1)}%</div>
                    <div class="stat-label">Engagement Rate</div>
                </div>
            </div>
            <style>
                .engagement-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
                .stat-item { text-align: center; padding: 1rem; background: #f8fafc; border-radius: 8px; }
                .stat-number { font-size: 2rem; font-weight: bold; color: #2563eb; }
                .stat-label { color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem; }
            </style>
        `;
    }

    renderFeedbackSummary(feedbackData) {
        if (feedbackData.length === 0) return '<p>No feedback data available</p>';
        
        return `
            <div class="feedback-summary">
                ${feedbackData.slice(0, 6).map(event => `
                    <div class="feedback-item">
                        <div class="feedback-header">
                            <h4>${event.title}</h4>
                            <div class="rating-display">
                                <span class="rating-stars">${'⭐'.repeat(Math.round(event.average_rating || 0))}</span>
                                <span class="rating-value">${event.average_rating || 'N/A'}</span>
                            </div>
                        </div>
                        <div class="feedback-breakdown">
                            <div class="feedback-count">${event.total_feedback} feedback responses</div>
                            <div class="star-breakdown">
                                <div class="star-row">5⭐: ${event.five_star || 0}</div>
                                <div class="star-row">4⭐: ${event.four_star || 0}</div>
                                <div class="star-row">3⭐: ${event.three_star || 0}</div>
                                <div class="star-row">2⭐: ${event.two_star || 0}</div>
                                <div class="star-row">1⭐: ${event.one_star || 0}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <style>
                .feedback-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
                .feedback-item { background: #f8fafc; padding: 1rem; border-radius: 8px; }
                .feedback-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
                .feedback-header h4 { margin: 0; font-size: 1rem; }
                .rating-display { display: flex; align-items: center; gap: 0.5rem; }
                .rating-stars { font-size: 0.9rem; }
                .rating-value { font-weight: bold; color: #2563eb; }
                .feedback-count { font-size: 0.9rem; color: #6b7280; margin-bottom: 0.5rem; }
                .star-breakdown { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.25rem; font-size: 0.8rem; }
                .star-row { text-align: center; padding: 0.25rem; background: white; border-radius: 4px; }
            </style>
        `;
    }

    // Reports
    async loadReports() {
        try {
            this.showLoading('admin-reports-content');
            
            // Reuse the reports from the main app but with admin styling
            const [popularity, participation, topStudents, colleges] = await Promise.all([
                this.apiCall('/reports/popularity'),
                this.apiCall('/reports/participation'),
                this.apiCall('/reports/top-students'),
                this.apiCall('/reports/colleges')
            ]);

            const reportsHTML = `
                <div class="grid grid-2">
                    <div class="chart-container">
                        <h3 class="chart-title">📊 Event Popularity Report</h3>
                        ${this.renderPopularityTable(popularity.data)}
                    </div>
                    <div class="chart-container">
                        <h3 class="chart-title">🏆 Top Active Students</h3>
                        ${this.renderTopStudentsTable(topStudents.data)}
                    </div>
                </div>
                
                <div class="chart-container">
                    <h3 class="chart-title">🏫 College Performance Summary</h3>
                    ${this.renderCollegeTable(colleges.data)}
                </div>
                
                <div class="chart-container">
                    <h3 class="chart-title">👥 Student Participation Details</h3>
                    ${this.renderParticipationTable(participation.data.slice(0, 20))}
                </div>
            `;

            document.getElementById('admin-reports-content').innerHTML = reportsHTML;
            
        } catch (error) {
            document.getElementById('admin-reports-content').innerHTML = 
                '<p class="admin-alert error">Failed to load reports</p>';
        }
    }

    renderPopularityTable(events) {
        if (events.length === 0) return '<p>No events found</p>';
        
        return `
            <table class="admin-table">
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

    renderTopStudentsTable(students) {
        if (students.length === 0) return '<p>No active students found</p>';
        
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Student</th>
                        <th>College</th>
                        <th>Events</th>
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

    renderCollegeTable(colleges) {
        if (colleges.length === 0) return '<p>No college data found</p>';
        
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>College</th>
                        <th>Students</th>
                        <th>Events</th>
                        <th>Registrations</th>
                        <th>Attendance Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${colleges.map(college => `
                        <tr>
                            <td><strong>${college.college_name}</strong></td>
                            <td>${college.total_students}</td>
                            <td>${college.total_events}</td>
                            <td>${college.total_registrations}</td>
                            <td>
                                <span class="badge ${this.getAttendanceClass(college.overall_attendance_rate)}">
                                    ${college.overall_attendance_rate}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderParticipationTable(students) {
        if (students.length === 0) return '<p>No student data found</p>';
        
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>College</th>
                        <th>Registered</th>
                        <th>Attended</th>
                        <th>Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => `
                        <tr>
                            <td>${student.name}</td>
                            <td>${student.college_name}</td>
                            <td>${student.events_registered}</td>
                            <td>${student.events_attended}</td>
                            <td>
                                <span class="badge ${this.getAttendanceClass(student.attendance_rate)}">
                                    ${student.attendance_rate}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Event Listeners
    setupEventListeners() {
        // Event creation form
        const createEventForm = document.getElementById('admin-create-event-form');
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

            // Get the raw date values from the form
            const startDateTimeRaw = formData.get('start_datetime');
            const endDateTimeRaw = formData.get('end_datetime');

            // Reformat the dates: replace 'T' with a space and add seconds
            const startDateTimeFormatted = startDateTimeRaw.replace('T', ' ') + ':00';
            const endDateTimeFormatted = endDateTimeRaw.replace('T', ' ') + ':00';

            const eventData = {
                title: formData.get('title'),
                description: formData.get('description'),
                event_type: formData.get('event_type'),
                college_id: parseInt(formData.get('college_id')),
                created_by: formData.get('created_by'),
                start_datetime: startDateTimeFormatted, // Use the formatted date
                end_datetime: endDateTimeFormatted,   // Use the formatted date
                location: formData.get('location'),
                max_capacity: parseInt(formData.get('max_capacity')) || 0
            };

            await this.apiCall('/events', 'POST', eventData);
            this.showAlert('success', 'Event created successfully!');
            form.reset();
            this.showSection('manage-events');
        } catch (error) {
            this.showAlert('error', 'Failed to create event: ' + error.message);
        }
    }

    // Event Management Actions
    async viewEventDetails(eventId) {
        try {
            const event = await this.apiCall(`/events/${eventId}`);
            // For now, just show an alert with basic info
            alert(`Event: ${event.data.title}\nLocation: ${event.data.location}\nCapacity: ${event.data.max_capacity}`);
        } catch (error) {
            this.showAlert('error', 'Failed to load event details');
        }
    }

    async manageRegistrations(eventId) {
        // This would open a modal or navigate to a registration management page
        alert(`Managing registrations for event: ${eventId}`);
    }

    async manageAttendance(eventId) {
        // This would open an attendance management interface
        alert(`Managing attendance for event: ${eventId}`);
    }

    async viewFeedback(eventId) {
        // This would show feedback for the event
        alert(`Viewing feedback for event: ${eventId}`);
    }

    async viewStudentProfile(studentId) {
        // This would show detailed student information
        alert(`Viewing profile for student: ${studentId}`);
    }

    async cancelEvent(eventId, eventTitle) {
        try {
            // Show confirmation dialog
            const reason = prompt(`Are you sure you want to cancel "${eventTitle}"?\n\nPlease provide a reason for cancellation (optional):`);
            
            if (reason === null) {
                return; // User cancelled
            }
            
            // Show loading state
            this.showAlert('info', 'Cancelling event...');
            
            // Call the API with proper error handling
            const response = await this.apiCall(`/events/${eventId}/cancel`, 'POST', {
                reason: reason || 'No reason provided'
            });
            
            if (response && response.success) {
                this.showAlert('success', `✅ Event "${eventTitle}" has been cancelled successfully!`);
                
                // Refresh the events list
                await this.loadManageEvents();
                
                // Show additional info if there were registrations
                if (response.data && response.data.registration_count > 0) {
                    setTimeout(() => {
                        this.showAlert('warning', `📢 ${response.data.registration_count} registered students have been notified about the cancellation.`);
                    }, 2000);
                }
                
                // Show info about where to find the cancelled event
                setTimeout(() => {
                    this.showAlert('info', `📋 Cancelled event "${eventTitle}" has been moved to the Cancelled section.`);
                }, 3000);
            } else {
                const errorMessage = response?.message || 'Unknown error occurred';
                this.showAlert('error', `❌ Failed to cancel event: ${errorMessage}`);
            }
            
        } catch (error) {
            console.error('Cancel event error:', error);
            this.showAlert('error', `❌ Error cancelling event: ${error.message || 'Please try again.'}`);
        }
    }

    async rescheduleEvent(eventId, eventTitle) {
        try {
            // Get current event details first
            const eventResponse = await this.apiCall(`/events/${eventId}`);
            
            if (!eventResponse.success) {
                this.showAlert('error', '❌ Could not load event details.');
                return;
            }
            
            const event = eventResponse.data;
            const currentStart = new Date(event.start_datetime);
            const currentEnd = new Date(event.end_datetime);
            
            // Show reschedule dialog
            const newStartDate = prompt(`Reschedule "${eventTitle}"\n\nCurrent start: ${currentStart.toLocaleString()}\n\nEnter new start date/time (YYYY-MM-DD HH:MM:SS):`);
            
            if (newStartDate === null) {
                return; // User cancelled
            }
            
            const newEndDate = prompt(`Enter new end date/time (YYYY-MM-DD HH:MM:SS):`);
            
            if (newEndDate === null) {
                return; // User cancelled
            }
            
            const reason = prompt(`Please provide a reason for rescheduling (optional):`);
            
            // Show loading state
            this.showAlert('info', 'Rescheduling event...');
            
            // Call the API
            const response = await this.apiCall(`/events/${eventId}/reschedule`, 'POST', {
                new_start_datetime: newStartDate,
                new_end_datetime: newEndDate,
                reason: reason || 'No reason provided'
            });
            
            if (response.success) {
                this.showAlert('success', `✅ Event "${eventTitle}" has been rescheduled successfully!`);
                
                // Refresh the events list
                await this.loadManageEvents();
                
                // Show additional info
                setTimeout(() => {
                    this.showAlert('info', `📅 Event rescheduled from ${response.data.old_start} to ${response.data.new_start}`);
                }, 2000);
            } else {
                this.showAlert('error', `❌ Failed to reschedule event: ${response.message}`);
            }
            
        } catch (error) {
            console.error('Reschedule event error:', error);
            this.showAlert('error', '❌ Error rescheduling event. Please try again.');
        }
    }

    async editEventDateTime(eventId, eventTitle, currentStart, currentEnd) {
        try {
            // Show edit dialog with current values
            const newStartDate = prompt(`Edit "${eventTitle}" Date/Time\n\nCurrent start: ${new Date(currentStart).toLocaleString()}\n\nEnter new start date/time (YYYY-MM-DD HH:MM:SS):`, 
                new Date(currentStart).toISOString().slice(0, 19).replace('T', ' '));
            
            if (newStartDate === null) {
                return; // User cancelled
            }
            
            const newEndDate = prompt(`Enter new end date/time (YYYY-MM-DD HH:MM:SS):`, 
                new Date(currentEnd).toISOString().slice(0, 19).replace('T', ' '));
            
            if (newEndDate === null) {
                return; // User cancelled
            }
            
            const reason = prompt(`Please provide a reason for editing (optional):`);
            
            // Show loading state
            this.showAlert('info', 'Updating event date/time...');
            
            // Call the API
            const response = await this.apiCall(`/events/${eventId}/reschedule`, 'POST', {
                new_start_datetime: newStartDate,
                new_end_datetime: newEndDate,
                reason: reason || 'Date/time updated'
            });
            
            if (response.success) {
                this.showAlert('success', `✅ Event "${eventTitle}" date/time updated successfully!`);
                
                // Refresh the events list
                await this.loadManageEvents();
                
                // Show additional info
                setTimeout(() => {
                    this.showAlert('info', `📅 Event updated from ${response.data.old_start} to ${response.data.new_start}`);
                }, 2000);
            } else {
                this.showAlert('error', `❌ Failed to update event: ${response.message}`);
            }
            
        } catch (error) {
            console.error('Edit event error:', error);
            this.showAlert('error', '❌ Error updating event. Please try again.');
        }
    }

    // Utility functions
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="admin-loading">
                    <div class="spinner"></div>
                    Loading...
                </div>
            `;
        }
    }

    showAlert(type, message) {
        // Create alerts container if it doesn't exist
        let alertsContainer = document.getElementById('admin-alerts-container');
        if (!alertsContainer) {
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'admin-alerts-container';
            alertsContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 2000; max-width: 400px;';
            document.body.appendChild(alertsContainer);
        }

        const alertClass = type === 'success' ? 'admin-alert success' : 'admin-alert error';
        const alertElement = document.createElement('div');
        alertElement.className = alertClass;
        alertElement.textContent = message;
        
        alertsContainer.appendChild(alertElement);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alertElement.remove();
        }, 5000);
    }
}

// Initialize admin app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminPortalApp();
});
