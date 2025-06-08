// A/B Test Analytics Tracking
class ABTestAnalytics {
    constructor() {
        this.testName = 'header_sidebar_redesign';
        this.variant = this.getVariant();
        this.sessionStart = Date.now();
        this.interactions = [];
        
        this.init();
    }
    
    getVariant() {
        return localStorage.getItem('ab_test_group') || 'control';
    }
    
    init() {
        // Track page views with variant
        this.trackEvent('page_view', {
            variant: this.variant,
            path: window.location.pathname
        });
        
        // Track interactions
        this.setupInteractionTracking();
        
        // Track session duration on unload
        window.addEventListener('beforeunload', () => {
            this.trackSessionDuration();
        });
    }
    
    setupInteractionTracking() {
        // Track sidebar interactions
        if (this.variant === 'variant') {
            // Sidebar toggle
            const sidebarToggle = document.querySelector('.sidebar-toggle');
            if (sidebarToggle) {
                sidebarToggle.addEventListener('click', () => {
                    const isCollapsed = document.querySelector('.dashboard-sidebar-v2').classList.contains('collapsed');
                    this.trackEvent('sidebar_toggle', {
                        action: isCollapsed ? 'expand' : 'collapse'
                    });
                });
            }
            
            // Track navigation group interactions
            document.querySelectorAll('.nav-group').forEach(group => {
                group.addEventListener('toggle', (e) => {
                    if (e.target.open) {
                        this.trackEvent('nav_group_opened', {
                            group: e.target.querySelector('.nav-group-header span').textContent
                        });
                    }
                });
            });
            
            // Track search usage
            const searchForm = document.querySelector('.search-form');
            if (searchForm) {
                searchForm.addEventListener('submit', () => {
                    this.trackEvent('search_used', {
                        location: 'header'
                    });
                });
            }
            
            // Track user menu interactions
            const userMenuButton = document.querySelector('.user-menu-button');
            if (userMenuButton) {
                userMenuButton.addEventListener('click', () => {
                    this.trackEvent('user_menu_opened');
                });
            }
        }
        
        // Track navigation clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && (link.classList.contains('nav-item') || link.classList.contains('nav-link'))) {
                this.trackEvent('navigation_click', {
                    destination: link.getAttribute('href'),
                    text: link.textContent.trim()
                });
            }
        });
    }
    
    trackEvent(eventName, parameters = {}) {
        const eventData = {
            test_name: this.testName,
            variant: this.variant,
            timestamp: Date.now(),
            ...parameters
        };
        
        // Store interaction
        this.interactions.push({
            event: eventName,
            data: eventData
        });
        
        // Send to Google Analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'AB_Test',
                event_label: this.testName,
                ...eventData
            });
        }
        
        // Send to custom analytics endpoint
        this.sendToAnalytics(eventName, eventData);
    }
    
    trackSessionDuration() {
        const duration = Date.now() - this.sessionStart;
        this.trackEvent('session_duration', {
            duration_ms: duration,
            duration_seconds: Math.floor(duration / 1000)
        });
    }
    
    sendToAnalytics(eventName, data) {
        // Send to your analytics endpoint
        fetch('/api/analytics/ab-test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event: eventName,
                data: data,
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                timestamp: new Date().toISOString()
            })
        }).catch(err => {
            console.error('Failed to send analytics:', err);
        });
    }
    
    // Method to get conversion metrics
    getConversionMetrics() {
        return {
            variant: this.variant,
            totalInteractions: this.interactions.length,
            uniqueEvents: [...new Set(this.interactions.map(i => i.event))],
            sessionDuration: Date.now() - this.sessionStart
        };
    }
}

// Initialize analytics when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.abTestAnalytics = new ABTestAnalytics();
});