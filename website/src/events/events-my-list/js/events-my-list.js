// events-my-list.js
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabs = document.querySelectorAll('.events-my-list-tab');
    let currentTab = 'all';
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('events-my-list-tab-active'));
            
            // Add active class to clicked tab
            this.classList.add('events-my-list-tab-active');
            
            // Filter events based on tab
            currentTab = this.getAttribute('data-tab');
            console.log('Filtering by tab:', currentTab);
            filterEvents(currentTab);
        });
    });

    // Filter events function
    function filterEvents(tab) {
        const cards = document.querySelectorAll('.events-my-list-card');
        
        cards.forEach(card => {
            const cardType = card.getAttribute('data-type');
            
            if (tab === 'all') {
                card.style.display = '';
            } else if (tab === cardType) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
        
        // Check if we need to show empty state
        checkEmptyState(tab);
    }

    // Check empty state
    function checkEmptyState(tab) {
        const grid = document.querySelector('.events-my-list-grid');
        const visibleCards = grid.querySelectorAll('.events-my-list-card:not([style*="display: none"])');
        
        if (visibleCards.length === 0) {
            // Show empty state if not already present
            if (!grid.querySelector('.events-my-list-empty')) {
                const emptyState = createEmptyState(tab);
                grid.appendChild(emptyState);
            }
        } else {
            // Remove empty state if present
            const emptyState = grid.querySelector('.events-my-list-empty');
            if (emptyState) {
                emptyState.remove();
            }
        }
    }

    // Create empty state element
    function createEmptyState(tab) {
        const div = document.createElement('div');
        div.className = 'events-my-list-empty';
        
        let message = '';
        switch(tab) {
            case 'organizing':
                message = "You're not organizing any events yet.";
                break;
            case 'attending':
                message = "You haven't registered for any upcoming events.";
                break;
            case 'past':
                message = "You haven't attended any events yet.";
                break;
            default:
                message = "No events to show.";
        }
        
        div.innerHTML = `
            <div class="events-my-list-empty-icon">📅</div>
            <h3 class="events-my-list-empty-title">No Events Found</h3>
            <p class="events-my-list-empty-text">${message}</p>
            <a href="/events/events-browse-calendar/" class="events-my-list-empty-button">
                Browse Events
            </a>
        `;
        
        return div;
    }

    // Manage event button clicks
    const manageButtons = document.querySelectorAll('[data-action="manage"]');
    manageButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const eventId = this.getAttribute('data-event-id');
            console.log('Managing event:', eventId);
            // Add management logic here
        });
    });

    // Cancel registration buttons
    const cancelButtons = document.querySelectorAll('[data-action="cancel"]');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const eventId = this.getAttribute('data-event-id');
            
            if (confirm('Are you sure you want to cancel your registration?')) {
                console.log('Canceling registration for event:', eventId);
                // Add cancellation logic here
                
                // Remove the card after cancellation
                const card = this.closest('.events-my-list-card');
                card.style.opacity = '0.5';
                setTimeout(() => {
                    card.remove();
                    checkEmptyState(currentTab);
                }, 300);
            }
        });
    });

    // Create event button
    const createButton = document.querySelector('.events-my-list-create-button');
    if (createButton) {
        createButton.addEventListener('click', function(e) {
            console.log('Creating new event');
            // Navigation is handled by the link
        });
    }
});