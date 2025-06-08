// Achievements App
class AchievementsApp {
    constructor() {
        this.currentFilter = 'all';
        this.currentSort = 'recent';
        this.achievements = [];
        this.searchQuery = '';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadAchievements();
        this.updateStats();
        this.animateProgressBars();
    }
    
    setupEventListeners() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });
        
        // Sort dropdown
        document.getElementById('sortAchievements').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.renderAchievements();
        });
        
        // Search functionality
        document.getElementById('achievementSearch').addEventListener('click', () => {
            document.getElementById('searchPanel').style.display = 'block';
            document.getElementById('achievementSearchInput').focus();
        });
        
        document.getElementById('closeSearch').addEventListener('click', () => {
            document.getElementById('searchPanel').style.display = 'none';
            this.searchQuery = '';
            this.renderAchievements();
        });
        
        document.getElementById('achievementSearchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderAchievements();
        });
        
        // Achievement cards
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.achievement-card');
            if (card && !e.target.closest('.btn-share')) {
                this.showAchievementDetails(card.dataset.achievementId);
            }
            
            if (e.target.closest('.btn-share')) {
                e.preventDefault();
                this.showShareModal(card.dataset.achievementId);
            }
        });
        
        // Modal close
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
        
        // Share achievement
        document.getElementById('shareAchievement').addEventListener('click', () => {
            document.getElementById('achievementModal').style.display = 'none';
            document.getElementById('shareModal').style.display = 'flex';
        });
        
        // Share options
        document.querySelectorAll('.share-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.currentTarget.className.split(' ')[1];
                this.shareOnPlatform(platform);
            });
        });
        
        // Leaderboard tabs
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.loadLeaderboard(e.currentTarget.textContent.toLowerCase());
            });
        });
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });
        
        this.renderAchievements();
    }
    
    loadAchievements() {
        // Simulate loading achievements from API
        // In a real app, this would be an API call
        this.achievements = this.generateMockAchievements();
        this.renderAchievements();
    }
    
    renderAchievements() {
        const grid = document.getElementById('achievementsGrid');
        const filtered = this.filterAchievements();
        const sorted = this.sortAchievements(filtered);
        
        // Keep featured achievement
        const featured = grid.querySelector('.achievement-featured');
        grid.innerHTML = '';
        if (featured) grid.appendChild(featured);
        
        // Render achievement cards
        sorted.forEach(achievement => {
            grid.appendChild(this.createAchievementCard(achievement));
        });
        
        // Animate new cards
        this.animateCards();
    }
    
    filterAchievements() {
        let filtered = this.achievements;
        
        // Apply filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(a => {
                switch(this.currentFilter) {
                    case 'unlocked':
                        return a.unlocked;
                    case 'progress':
                        return !a.unlocked && a.progress > 0;
                    case 'locked':
                        return !a.unlocked && a.progress === 0;
                    default:
                        return a.category === this.currentFilter;
                }
            });
        }
        
        // Apply search
        if (this.searchQuery) {
            filtered = filtered.filter(a => 
                a.name.toLowerCase().includes(this.searchQuery) ||
                a.description.toLowerCase().includes(this.searchQuery)
            );
        }
        
        return filtered;
    }
    
    sortAchievements(achievements) {
        return [...achievements].sort((a, b) => {
            switch(this.currentSort) {
                case 'recent':
                    return (b.unlockedDate || 0) - (a.unlockedDate || 0);
                case 'progress':
                    return b.progress - a.progress;
                case 'points':
                    return b.points - a.points;
                case 'rarity':
                    return a.rarity - b.rarity;
                case 'alphabetical':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    }
    
    createAchievementCard(achievement) {
        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'} ${achievement.tier}`;
        card.dataset.achievementId = achievement.id;
        
        const tierLabel = achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1);
        
        card.innerHTML = `
            <div class="card-content">
                ${achievement.tier === 'legendary' ? '<div class="card-glow"></div>' : ''}
                <div class="achievement-tier">${tierLabel}</div>
                <div class="achievement-icon">
                    <div class="icon-wrapper">${achievement.icon}</div>
                </div>
                <h3 class="achievement-name">${achievement.name}</h3>
                <p class="achievement-description">${achievement.description}</p>
                
                ${!achievement.unlocked && achievement.progress > 0 ? `
                    <div class="achievement-progress">
                        <div class="progress-header">
                            <span class="progress-label">Progress</span>
                            <span class="progress-value">${achievement.progressText}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${achievement.progress}%;"></div>
                        </div>
                        ${achievement.progressHint ? `<div class="progress-hint">${achievement.progressHint}</div>` : ''}
                    </div>
                ` : ''}
                
                ${achievement.unlocked ? `
                    <div class="achievement-footer">
                        <div class="unlock-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${this.formatDate(achievement.unlockedDate)}</span>
                        </div>
                        <button class="btn-share" title="Share achievement">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                    </div>
                ` : ''}
                
                <div class="achievement-stats">
                    <div class="stat">
                        <span class="stat-label">Points</span>
                        <span class="stat-value">${achievement.points}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Rarity</span>
                        <span class="stat-value">${achievement.rarity}%</span>
                    </div>
                </div>
                
                ${!achievement.unlocked ? '<div class="lock-overlay"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>' : ''}
            </div>
        `;
        
        return card;
    }
    
    showAchievementDetails(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement) return;
        
        // Update modal content
        const modal = document.getElementById('achievementModal');
        modal.querySelector('.detail-title').textContent = achievement.name;
        modal.querySelector('.detail-description').textContent = achievement.description;
        modal.querySelector('.icon-large').textContent = achievement.icon;
        
        modal.style.display = 'flex';
    }
    
    showShareModal(achievementId) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (!achievement) return;
        
        const modal = document.getElementById('shareModal');
        modal.querySelector('.preview-icon').textContent = achievement.icon;
        modal.querySelector('.preview-content h3').textContent = achievement.name;
        
        modal.style.display = 'flex';
    }
    
    shareOnPlatform(platform) {
        console.log(`Sharing on ${platform}`);
        this.showNotification(`Shared on ${platform}!`);
        document.getElementById('shareModal').style.display = 'none';
    }
    
    updateStats() {
        // Update progress circles and stats
        const circles = document.querySelectorAll('.circular-chart .circle');
        circles.forEach(circle => {
            const value = circle.getAttribute('stroke-dasharray').split(',')[0];
            circle.style.strokeDasharray = `0, 100`;
            setTimeout(() => {
                circle.style.strokeDasharray = `${value}, 100`;
            }, 100);
        });
    }
    
    animateProgressBars() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progressBar = entry.target.querySelector('.progress-fill');
                    if (progressBar) {
                        const width = progressBar.style.width;
                        progressBar.style.width = '0';
                        setTimeout(() => {
                            progressBar.style.width = width;
                        }, 100);
                    }
                }
            });
        });
        
        document.querySelectorAll('.achievement-progress').forEach(el => {
            observer.observe(el);
        });
    }
    
    animateCards() {
        const cards = document.querySelectorAll('.achievement-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
    
    loadLeaderboard(type) {
        console.log(`Loading ${type} leaderboard`);
        // In a real app, this would load different leaderboard data
    }
    
    formatDate(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(45deg, #fbbf24, #f59e0b);
            color: #0a0e27;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    
    generateMockAchievements() {
        // Generate mock achievement data
        return [
            {
                id: '1',
                name: 'Century Rider',
                description: 'Complete a 100-mile ride in a single activity',
                icon: '🏆',
                tier: 'legendary',
                category: 'distance',
                points: 50,
                rarity: 12,
                unlocked: true,
                unlockedDate: new Date('2024-06-05').getTime(),
                progress: 100
            },
            {
                id: '2',
                name: 'Mountain Goat',
                description: 'Climb 10,000 feet in a single ride',
                icon: '⛰️',
                tier: 'epic',
                category: 'climbing',
                points: 40,
                rarity: 8,
                unlocked: true,
                unlockedDate: new Date('2024-05-15').getTime(),
                progress: 100
            },
            {
                id: '3',
                name: 'Consistency King',
                description: 'Ride every day for 30 days straight',
                icon: '🔥',
                tier: 'rare',
                category: 'special',
                points: 30,
                rarity: 5,
                unlocked: false,
                progress: 80,
                progressText: '24/30 days',
                progressHint: '6 days to go!'
            },
            {
                id: '4',
                name: 'Explorer',
                description: 'Ride in 10 different cities',
                icon: '📍',
                tier: 'common',
                category: 'distance',
                points: 15,
                rarity: 45,
                unlocked: false,
                progress: 70,
                progressText: '7/10 cities'
            },
            {
                id: '5',
                name: 'Speed Demon',
                description: 'Average over 30 mph for a 20+ mile ride',
                icon: '⚡',
                tier: 'epic',
                category: 'speed',
                points: 40,
                rarity: 3,
                unlocked: false,
                progress: 0
            }
        ];
    }
}

// Initialize app
const app = new AchievementsApp();