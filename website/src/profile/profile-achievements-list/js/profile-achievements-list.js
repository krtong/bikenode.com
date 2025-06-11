// Profile Achievements List Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize filter tabs
    initFilterTabs();
    
    // Initialize share buttons
    initShareButtons();
    
    // Initialize load more functionality
    initLoadMore();
    
    // Initialize achievement cards interactions
    initAchievementCards();
});

// Filter tabs functionality
function initFilterTabs() {
    const tabs = document.querySelectorAll('.profile-achievements-list-tab');
    const cards = document.querySelectorAll('.profile-achievements-list-card');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Filter cards
            const filter = this.dataset.filter;
            filterAchievements(filter);
        });
    });
}

// Filter achievements based on status
function filterAchievements(filter) {
    const cards = document.querySelectorAll('.profile-achievements-list-card');
    
    cards.forEach(card => {
        if (filter === 'all') {
            card.style.display = 'block';
        } else {
            const status = card.dataset.status;
            card.style.display = status === filter ? 'block' : 'none';
        }
    });
    
    // Animate visible cards
    animateVisibleCards();
}

// Animate cards when they become visible
function animateVisibleCards() {
    const visibleCards = document.querySelectorAll('.profile-achievements-list-card[style*="block"]');
    
    visibleCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
}

// Share button functionality
function initShareButtons() {
    const shareButtons = document.querySelectorAll('.profile-achievements-list-btn-share');
    
    shareButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Get achievement details
            const card = this.closest('.profile-achievements-list-card');
            const achievementName = card.querySelector('.profile-achievements-list-name').textContent;
            
            // Show share options (placeholder - implement actual share modal)
            showShareModal(achievementName);
        });
    });
}

// Show share modal (placeholder function)
function showShareModal(achievementName) {
    // Create a simple notification for now
    const notification = document.createElement('div');
    notification.className = 'profile-achievements-list-notification';
    notification.textContent = `Share "${achievementName}" achievement`;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--accent);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load more functionality
function initLoadMore() {
    const loadMoreBtn = document.querySelector('.profile-achievements-list-load-more button');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            // Simulate loading more achievements
            this.textContent = 'Loading...';
            this.disabled = true;
            
            setTimeout(() => {
                // Add more achievements (placeholder - implement actual data loading)
                addMoreAchievements();
                
                this.textContent = 'Load More Achievements';
                this.disabled = false;
            }, 1000);
        });
    }
}

// Add more achievements (placeholder function)
function addMoreAchievements() {
    const grid = document.querySelector('.profile-achievements-list-grid');
    
    // Sample achievement data
    const newAchievements = [
        {
            tier: 'rare',
            status: 'unlocked',
            icon: '🌅',
            name: 'Early Bird',
            description: 'Complete 10 rides before 7 AM',
            points: 25,
            rarity: '15%',
            date: 'Apr 20, 2024'
        },
        {
            tier: 'common',
            status: 'progress',
            icon: '🌧️',
            name: 'Rain Rider',
            description: 'Ride in the rain 5 times',
            progress: '3/5 rides',
            progressPercent: 60,
            points: 10,
            rarity: '35%'
        },
        {
            tier: 'epic',
            status: 'locked',
            icon: '🚴',
            name: 'Gran Fondo Master',
            description: 'Complete a Gran Fondo event',
            requirement: 'Participate in an official Gran Fondo',
            points: 45,
            rarity: '7%'
        }
    ];
    
    // Create and append new achievement cards
    newAchievements.forEach((achievement, index) => {
        const card = createAchievementCard(achievement);
        grid.appendChild(card);
        
        // Animate new card
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Create achievement card element
function createAchievementCard(data) {
    const card = document.createElement('div');
    card.className = `profile-achievements-list-card ${data.status} ${data.tier}`;
    card.dataset.tier = data.tier;
    card.dataset.status = data.status;
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    let progressHTML = '';
    if (data.status === 'progress') {
        progressHTML = `
            <div class="profile-achievements-list-progress">
                <div class="profile-achievements-list-progress-header">
                    <span class="profile-achievements-list-progress-label">Progress</span>
                    <span class="profile-achievements-list-progress-value">${data.progress}</span>
                </div>
                <div class="profile-achievements-list-progress-bar">
                    <div class="profile-achievements-list-progress-fill" style="width: ${data.progressPercent}%;"></div>
                </div>
            </div>
        `;
    }
    
    let lockHTML = '';
    if (data.status === 'locked') {
        lockHTML = `
            <div class="profile-achievements-list-lock-overlay">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <div class="profile-achievements-list-unlock-requirement">
                <span class="profile-achievements-list-requirement-label">Unlock requirement:</span>
                <span class="profile-achievements-list-requirement-text">${data.requirement}</span>
            </div>
        `;
    }
    
    let footerHTML = '';
    if (data.status === 'unlocked') {
        footerHTML = `
            <div class="profile-achievements-list-footer">
                <div class="profile-achievements-list-unlock-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>${data.date}</span>
                </div>
                <button class="profile-achievements-list-btn-share" title="Share achievement">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="profile-achievements-list-card-content">
            ${lockHTML}
            <div class="profile-achievements-list-tier">${data.tier}</div>
            <div class="profile-achievements-list-icon">
                <div class="profile-achievements-list-icon-wrapper">${data.icon}</div>
            </div>
            <h3 class="profile-achievements-list-name">${data.name}</h3>
            <p class="profile-achievements-list-description">${data.description}</p>
            ${progressHTML}
            <div class="profile-achievements-list-stats">
                <div class="profile-achievements-list-stat">
                    <span class="profile-achievements-list-stat-label">Points</span>
                    <span class="profile-achievements-list-stat-value">${data.points}</span>
                </div>
                <div class="profile-achievements-list-stat">
                    <span class="profile-achievements-list-stat-label">Rarity</span>
                    <span class="profile-achievements-list-stat-value">${data.rarity}</span>
                </div>
            </div>
            ${footerHTML}
        </div>
    `;
    
    return card;
}

// Achievement card interactions
function initAchievementCards() {
    const cards = document.querySelectorAll('.profile-achievements-list-card');
    
    cards.forEach(card => {
        card.addEventListener('click', function() {
            if (!this.classList.contains('locked')) {
                // Show achievement details (placeholder - implement actual modal)
                const name = this.querySelector('.profile-achievements-list-name').textContent;
                console.log(`Viewing achievement: ${name}`);
            }
        });
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);