// Student App JavaScript

class StudentApp {
    constructor() {
        this.baseURL = '/api';
        this.currentSection = 'home';
        this.currentStudent = null;
        this.init();
    }

    init() {
        this.setupNavigation();
        this.loadHome();
        this.setupEventListeners();
        this.checkInstallPrompt();
    }

    // Navigation
    setupNavigation() {
        const navBtns = document.querySelectorAll('.mobile-nav-btn');
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
        document.querySelectorAll('.mobile-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update active nav button
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        this.currentSection = sectionName;

        // Load section content
        switch (sectionName) {
            case 'home':
                this.loadHome();
                break;
            case 'events':
                this.loadEvents();
                break;
            case 'my-events':
                this.loadMyEvents();
                break;
            case 'profile':
                this.loadProfile();
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

    // Home Section
    async loadHome() {
        try {
            const studentEmail = 'alice@student.com'; // In a real app, this would be dynamic
            
            // Load real student statistics and events
            const [eventsResponse, statsResponse, myEventsResponse] = await Promise.all([
                this.apiCall('/events'),
                this.apiCall(`/students/${studentEmail}/stats`),
                this.apiCall(`/students/${studentEmail}/my-events`)
            ]);

            if (statsResponse.success && myEventsResponse.success) {
                const stats = statsResponse.data;
                const myEvents = myEventsResponse.data;
                
                // Update stats with real data
                document.getElementById('upcoming-events').textContent = myEvents.upcoming.length;
                document.getElementById('my-registrations').textContent = stats.total_registrations_all; // Show all registrations
                document.getElementById('events-attended').textContent = stats.total_attendance;
                
                console.log('Home stats updated:', {
                    upcoming: myEvents.upcoming.length,
                    registrations: stats.total_registrations_all,
                    attended: stats.total_attendance
                });
            } else {
                throw new Error('Failed to fetch student data');
            }

            // Load featured events (first 3 available events)
            const availableEvents = eventsResponse.data.filter(event => 
                !myEventsResponse.data.registered.some(reg => reg.id === event.id) &&
                !myEventsResponse.data.attended.some(att => att.id === event.id)
            );
            
            this.renderFeaturedEvents(availableEvents.slice(0, 3));

        } catch (error) {
            console.error('Home loading error:', error);
            // Fallback to demo data if API fails
            document.getElementById('upcoming-events').textContent = '0';
            document.getElementById('my-registrations').textContent = '19';
            document.getElementById('events-attended').textContent = '4';
        }
    }

    renderFeaturedEvents(events) {
        const container = document.getElementById('featured-events');
        
        if (events.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 2rem; color: #6b7280;">No events available</p>';
            return;
        }

        const eventsHTML = events.map(event => `
            <div class="event-card-mobile">
                <div class="event-card-header">
                    <h3 class="event-card-title">${event.title}</h3>
                    <span class="event-type-badge">${event.event_type}</span>
                </div>
                <div class="event-card-meta">
                    <div>📅 ${new Date(event.start_datetime).toLocaleDateString()}</div>
                    <div>⏰ ${new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div>🏫 ${event.college_name}</div>
                    <div>📍 ${event.location}</div>
                </div>
                <div class="event-card-description">${event.description}</div>
                <div class="event-card-actions">
                    <button class="event-action-btn primary" onclick="studentApp.showEventDetails('${event.id}')">
                        View Details
                    </button>
                    <button class="event-action-btn success" onclick="studentApp.registerForEvent('${event.id}')">
                        Register
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    // Events Section
    async loadEvents() {
        try {
            this.showLoading('events-list-mobile');
            
            const studentEmail = 'alice@student.com'; // In a real app, this would be dynamic
            
            // Fetch all events and student's registered events
            const [eventsResponse, myEventsResponse] = await Promise.all([
                this.apiCall('/events'),
                this.apiCall(`/students/${studentEmail}/my-events`)
            ]);
            
            if (eventsResponse.success && myEventsResponse.success) {
                const allEvents = eventsResponse.data;
                const myEvents = myEventsResponse.data;
                
                // Get IDs of events the student has registered for or attended
                const registeredEventIds = new Set([
                    ...myEvents.registered.map(e => e.id),
                    ...myEvents.attended.map(e => e.id)
                ]);
                
                // Filter out events the student has already registered for
                const availableEvents = allEvents.filter(event => !registeredEventIds.has(event.id));
                
                // Setup search and filter
                this.setupEventSearch(availableEvents);
                
                this.renderEventsList(availableEvents);
                
                console.log(`Showing ${availableEvents.length} available events (filtered out ${registeredEventIds.size} already registered)`);
            } else {
                throw new Error('Failed to fetch events');
            }
            
        } catch (error) {
            console.error('Error loading events:', error);
            document.getElementById('events-list-mobile').innerHTML = 
                '<p class="text-center" style="padding: 2rem; color: #ef4444;">Failed to load events</p>';
        }
    }

    setupEventSearch(allEvents) {
        const searchInput = document.getElementById('event-search');
        const typeFilter = document.getElementById('event-type-filter-mobile');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterEvents(allEvents);
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.filterEvents(allEvents);
            });
        }
    }

    filterEvents(allEvents) {
        const searchTerm = document.getElementById('event-search')?.value.toLowerCase() || '';
        const eventType = document.getElementById('event-type-filter-mobile')?.value || '';

        let filteredEvents = allEvents;

        if (searchTerm) {
            filteredEvents = filteredEvents.filter(event =>
                event.title.toLowerCase().includes(searchTerm) ||
                event.description.toLowerCase().includes(searchTerm) ||
                event.location.toLowerCase().includes(searchTerm)
            );
        }

        if (eventType) {
            filteredEvents = filteredEvents.filter(event => event.event_type === eventType);
        }

        this.renderEventsList(filteredEvents);
    }

    renderEventsList(events) {
        const container = document.getElementById('events-list-mobile');
        
        if (events.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 2rem; color: #6b7280;">No events found</p>';
            return;
        }

        const eventsHTML = events.map(event => `
            <div class="event-card-mobile">
                <div class="event-card-header">
                    <h3 class="event-card-title">${event.title}</h3>
                    <span class="event-type-badge">${event.event_type}</span>
                </div>
                <div class="event-card-meta">
                    <div>📅 ${new Date(event.start_datetime).toLocaleDateString()}</div>
                    <div>⏰ ${new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div>🏫 ${event.college_name}</div>
                    <div>📍 ${event.location}</div>
                    ${event.max_capacity ? `<div>👥 Capacity: ${event.max_capacity}</div>` : ''}
                </div>
                <div class="event-card-description">${event.description}</div>
                <div class="event-card-actions">
                    <button class="event-action-btn outline" onclick="studentApp.showEventDetails('${event.id}')">
                        Details
                    </button>
                    <button class="event-action-btn primary" onclick="studentApp.registerForEvent('${event.id}')">
                        Register
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    // My Events Section
    async loadMyEvents() {
        try {
            this.showLoading('my-events-content');
            
            const studentEmail = 'alice@student.com'; // In a real app, this would be dynamic
            
            // Fetch categorized events from the new API
            const response = await this.apiCall(`/students/${studentEmail}/my-events`);
            
            if (response.success) {
                const categorizedEvents = response.data;
                
                // Store the categorized events for tab switching
                this.categorizedEvents = categorizedEvents;
                
                // Setup event tabs
                this.setupEventTabs();
                
                // Show registered tab by default
                this.showMyEventsTab('registered');
                
                console.log('My Events loaded:', categorizedEvents);
            } else {
                throw new Error('Failed to fetch my events');
            }
            
        } catch (error) {
            console.error('Error loading my events:', error);
            document.getElementById('my-events-content').innerHTML = 
                '<p class="text-center" style="padding: 2rem; color: #ef4444;">Failed to load your events</p>';
        }
    }

    setupEventTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active tab
                tabBtns.forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                
                // Show corresponding content
                const tab = btn.dataset.tab;
                this.showMyEventsTab(tab);
            });
        });
    }

    showMyEventsTab(tab) {
        if (!this.categorizedEvents) {
            console.error('No categorized events available');
            return;
        }
        
        const events = this.categorizedEvents[tab] || [];
        this.renderMyEventsList(events, tab);
    }

    renderMyEventsList(events, tab) {
        const container = document.getElementById('my-events-content');
        
        if (events.length === 0) {
            const message = {
                'registered': 'You haven\'t registered for any events yet',
                'attended': 'You haven\'t attended any events yet',
                'upcoming': 'No upcoming events available'
            };
            
            container.innerHTML = `
                <div class="text-center" style="padding: 2rem;">
                    <p style="color: #6b7280; margin-bottom: 1rem;">${message[tab]}</p>
                    <button class="btn btn-primary" onclick="studentApp.showSection('events')">
                        Browse Events
                    </button>
                </div>
            `;
            return;
        }

        const eventsHTML = events.map(event => `
            <div class="event-card-mobile">
                <div class="event-card-header">
                    <h3 class="event-card-title">${event.title}</h3>
                    <span class="event-type-badge">${event.event_type}</span>
                </div>
                <div class="event-card-meta">
                    <div>📅 ${new Date(event.start_datetime).toLocaleDateString()}</div>
                    <div>⏰ ${new Date(event.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div>🏫 ${event.college_name}</div>
                    <div>📍 ${event.location}</div>
                </div>
                <div class="event-card-actions">
                    ${this.getEventActions(event, tab)}
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    getEventActions(event, tab) {
        switch (tab) {
            case 'registered':
                return `
                    <button class="event-action-btn outline" onclick="studentApp.showEventDetails('${event.id}')">
                        View Details
                    </button>
                    <button class="event-action-btn success" onclick="studentApp.checkInToEvent('${event.id}')">
                        Check In
                    </button>
                `;
            case 'attended':
                return `
                    <button class="event-action-btn outline" onclick="studentApp.showEventDetails('${event.id}')">
                        View Details
                    </button>
                    <button class="event-action-btn primary" onclick="studentApp.submitEventFeedback('${event.id}')">
                        Give Feedback
                    </button>
                `;
            case 'upcoming':
                return `
                    <button class="event-action-btn outline" onclick="studentApp.showEventDetails('${event.id}')">
                        View Details
                    </button>
                    <button class="event-action-btn primary" onclick="studentApp.registerForEvent('${event.id}')">
                        Register
                    </button>
                `;
            default:
                return '';
        }
    }

    // Profile Section
    async loadProfile() {
        try {
            const studentEmail = 'alice@student.com'; // In a real app, this would be dynamic
            
            // Fetch real student statistics
            const statsResponse = await this.apiCall(`/students/${studentEmail}/stats`);
            
            if (statsResponse.success) {
                const stats = statsResponse.data;
                
                // Update student info
                document.getElementById('student-name').textContent = stats.name;
                document.getElementById('student-email').textContent = stats.email;
                document.getElementById('student-college').textContent = stats.college_name;
                
                // Update profile stats with real data
                document.getElementById('profile-registered').textContent = stats.total_registrations;
                document.getElementById('profile-attended').textContent = stats.total_attendance;
                document.getElementById('profile-feedback').textContent = stats.total_feedback;
                
                console.log('Profile stats updated:', stats);
            } else {
                throw new Error('Failed to fetch student stats');
            }
            
            // Load recent activity
            this.loadRecentActivity();
            
        } catch (error) {
            console.error('Profile loading error:', error);
            // Fallback to demo data if API fails
            document.getElementById('student-name').textContent = 'Alice Johnson';
            document.getElementById('student-email').textContent = 'alice@student.com';
            document.getElementById('student-college').textContent = 'BRP College of Engineering';
            
            document.getElementById('profile-registered').textContent = '14';
            document.getElementById('profile-attended').textContent = '4';
            document.getElementById('profile-feedback').textContent = '4';
        }
    }

    loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        
        // Demo activity data
        const activities = [
            {
                type: 'registered',
                text: 'Registered for AI/ML Workshop',
                time: '2 hours ago'
            },
            {
                type: 'attended',
                text: 'Attended Hackathon 2025',
                time: '1 day ago'
            },
            {
                type: 'feedback',
                text: 'Gave feedback for Tech Talk',
                time: '3 days ago'
            }
        ];

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <p class="activity-text">${activity.text}</p>
                    <p class="activity-time">${activity.time}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = activitiesHTML;
    }

    getActivityIcon(type) {
        switch (type) {
            case 'registered':
                return '📝';
            case 'attended':
                return '✅';
            case 'feedback':
                return '⭐';
            default:
                return '📅';
        }
    }

    // Event Actions
    async showEventDetails(eventId) {
        try {
            const event = await this.apiCall(`/events/${eventId}`);
            
            const modal = document.getElementById('event-details-modal');
            document.getElementById('modal-event-title').textContent = event.data.title;
            
            const content = `
                <div style="padding: 1.5rem;">
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: #1f2937; margin-bottom: 0.5rem;">📝 Description</h4>
                        <p style="color: #374151;">${event.data.description}</p>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <h4 style="color: #1f2937; margin-bottom: 0.5rem;">ℹ️ Event Details</h4>
                        <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                            <div><strong>📅 Date:</strong> ${new Date(event.data.start_datetime).toLocaleDateString()}</div>
                            <div><strong>⏰ Time:</strong> ${new Date(event.data.start_datetime).toLocaleTimeString()}</div>
                            <div><strong>📍 Location:</strong> ${event.data.location}</div>
                            <div><strong>🎯 Type:</strong> ${event.data.event_type}</div>
                            <div><strong>🏫 College:</strong> ${event.data.college_name}</div>
                            ${event.data.max_capacity ? `<div><strong>👥 Capacity:</strong> ${event.data.max_capacity}</div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button class="btn btn-primary" onclick="studentApp.registerForEvent('${event.data.id}'); studentApp.closeEventModal();">
                            Register Now
                        </button>
                        <button class="btn btn-outline" onclick="studentApp.closeEventModal()">
                            Close
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('event-details-content').innerHTML = content;
            modal.classList.add('active');
            
        } catch (error) {
            this.showAlert('error', 'Failed to load event details');
        }
    }

    async registerForEvent(eventId) {
        // For demo purposes, use a fixed student email
        const studentEmail = 'alice@student.com';
        
        try {
            await this.apiCall(`/events/${eventId}/register`, 'POST', {
                student_email: studentEmail
            });
            
            this.showAlert('success', 'Successfully registered for the event!');
            
            // Refresh all sections to sync data
            await this.refreshAllSections();
            
        } catch (error) {
            this.showAlert('error', `Registration failed: ${error.message}`);
        }
    }

    async checkInToEvent(eventId) {
        // For demo purposes, use a fixed student email
        const studentEmail = 'alice@student.com';
        
        try {
            await this.apiCall(`/events/${eventId}/checkin`, 'POST', {
                student_email: studentEmail
            });
            
            this.showAlert('success', 'Successfully checked in!');
            
            // Refresh all sections to sync data
            await this.refreshAllSections();
            
        } catch (error) {
            this.showAlert('error', `Check-in failed: ${error.message}`);
        }
    }

    async submitEventFeedback(eventId) {
        // Show feedback modal
        const modal = document.getElementById('feedback-modal');
        modal.classList.add('active');
        
        // Load attended events for the current student
        await this.loadAttendedEventsForFeedback();
        
        // Set up the form for this specific event
        const form = document.getElementById('feedback-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const selectedEventId = document.getElementById('feedback-event-select').value;
            const rating = document.getElementById('feedback-rating').value;
            const comments = document.getElementById('feedback-comments').value;
            
            if (!selectedEventId) {
                this.showAlert('error', 'Please select an event');
                return;
            }
            
            if (!rating) {
                this.showAlert('error', 'Please select a rating');
                return;
            }
            
            try {
                await this.apiCall(`/events/${selectedEventId}/feedback`, 'POST', {
                    student_email: 'alice@student.com',
                    rating: parseInt(rating),
                    comments: comments
                });
                
                this.showAlert('success', 'Thank you for your feedback!');
                this.closeFeedbackModal();
                
                // Refresh all sections to sync data
                await this.refreshAllSections();
                
            } catch (error) {
                this.showAlert('error', `Failed to submit feedback: ${error.message}`);
            }
        };
    }

    async loadAttendedEventsForFeedback() {
        try {
            const studentEmail = 'alice@student.com'; // In a real app, this would be dynamic
            const response = await this.apiCall(`/students/${studentEmail}/attended-events-no-feedback`);
            
            const eventSelect = document.getElementById('feedback-event-select');
            eventSelect.innerHTML = '<option value="">Choose an event you attended</option>';
            
            if (response.data && response.data.length > 0) {
                response.data.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = `${event.title} (${event.college_name})`;
                    eventSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No events available for feedback';
                option.disabled = true;
                eventSelect.appendChild(option);
            }
            
        } catch (error) {
            console.error('Error loading attended events:', error);
            this.showAlert('error', 'Failed to load attended events');
        }
    }

    // Modal Management
    closeEventModal() {
        document.getElementById('event-details-modal').classList.remove('active');
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        modal.classList.remove('active');
        
        // Reset form
        const form = document.getElementById('feedback-form');
        form.reset();
    }

    // Quick Actions
    showQRScanner() {
        // For demo purposes, show alert
        this.showAlert('info', 'QR Scanner feature coming soon! For now, use the Check In buttons on your registered events.');
    }

    showFeedbackForm() {
        // Show the feedback modal
        const modal = document.getElementById('feedback-modal');
        modal.classList.add('active');
    }

    showProfile() {
        this.showSection('profile');
    }

    // Profile Actions
    editProfile() {
        this.showAlert('info', 'Profile editing feature coming soon!');
    }

    viewHistory() {
        this.showAlert('info', 'Detailed activity history coming soon!');
    }

    showSettings() {
        this.showAlert('info', 'Settings panel coming soon!');
    }

    // Event Listeners
    setupEventListeners() {
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    // PWA Features (Install prompt removed from student portal as requested)
    checkInstallPrompt() {
        // Install prompt functionality has been disabled for student portal
        // PWA functionality is still available through browser settings
        console.log('Install prompt disabled for student portal');
    }

    async installApp() {
        // Install prompt removed - users can still install via browser
        this.showAlert('info', 'App installation is available through your browser settings');
    }

    showInstallInstructions() {
        // No automatic install instructions
        this.showAlert('info', 'Check your browser menu for installation options');
    }

    dismissInstall() {
        // No install prompt to dismiss
        console.log('No install prompt to dismiss');
    }

    async refreshAllSections() {
        // Refresh all sections to sync data after changes
        try {
            console.log('🔄 Refreshing all sections...');
            
            // Refresh current section
            const currentSection = document.querySelector('.mobile-section.active');
            if (currentSection) {
                const sectionId = currentSection.id;
                switch (sectionId) {
                    case 'home':
                        await this.loadHome();
                        break;
                    case 'events':
                        await this.loadEvents();
                        break;
                    case 'my-events':
                        await this.loadMyEvents();
                        break;
                    case 'profile':
                        await this.loadProfile();
                        break;
                }
            }
            
            console.log('✅ All sections refreshed');
            
        } catch (error) {
            console.error('Error refreshing sections:', error);
        }
    }

    // Utility functions
    showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading-mobile">
                    <div class="spinner"></div>
                    Loading...
                </div>
            `;
        }
    }

    showAlert(type, message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert ${type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-warning'}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 3000;
            max-width: 90%;
            max-height: 300px;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-radius: 8px;
            padding: 1rem;
            font-size: 0.9rem;
            line-height: 1.4;
        `;
        
        // Support HTML content for install instructions
        if (message.includes('<strong>') || message.includes('<br>')) {
            toast.innerHTML = message;
        } else {
            toast.textContent = message;
        }
        
        document.body.appendChild(toast);
        
        // Auto remove after 6 seconds for longer messages
        const timeout = message.length > 100 ? 8000 : 4000;
        setTimeout(() => {
            toast.remove();
        }, timeout);
        
        // Allow manual close by clicking
        toast.style.cursor = 'pointer';
        toast.addEventListener('click', () => {
            toast.remove();
        });
    }
}

// Initialize student app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.studentApp = new StudentApp();
});
