// Following Page App
class FollowingApp {
    constructor() {
        this.currentTab = 'followers';
        this.currentView = 'grid';
        this.users = [];
        this.filteredUsers = [];
        this.page = 1;
        this.perPage = 12;
        this.isLoading = false;
        this.searchQuery = '';
        this.filters = {
            location: '',
            style: '',
            activity: ''
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadUsers();
        this.initializeAnimations();
        this.setupIntersectionObserver();
    }
    
    bindEvents() {
        // Tab switching
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.filter-tab')));
        });
        
        // View toggle
        document.querySelectorAll('.view-option').forEach(option => {
            option.addEventListener('click', (e) => this.switchView(e.target.closest('.view-option')));
        });
        
        // Search functionality
        const searchInput = document.getElementById('userSearchInput');
        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value;
                this.filterAndDisplayUsers();
            }, 300);
        });
        
        // Sort functionality
        document.getElementById('sortUsers')?.addEventListener('change', (e) => {
            this.sortUsers(e.target.value);
        });
        
        // Advanced filters
        document.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', () => this.applyFilters());
        });
        
        // Clear filters
        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Load more
        document.getElementById('loadMoreFollowers')?.addEventListener('click', () => {
            this.loadMore();
        });
        
        // User interactions
        this.bindUserCardEvents();
        
        // Find riders button
        document.getElementById('findRiders')?.addEventListener('click', () => {
            this.switchTab(document.querySelector('[data-tab="suggested"]'));
        });
        
        // Invite friends
        document.getElementById('inviteFriends')?.addEventListener('click', () => {
            this.showInviteModal();
        });
    }
    
    bindUserCardEvents() {
        // Follow/Unfollow buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.follow-btn, .following')) {
                this.toggleFollow(e.target);
            }
            
            // Message button
            if (e.target.closest('.message-btn')) {
                const userId = e.target.closest('.user-card').dataset.userId;
                this.showMessageModal(userId);
            }
            
            // Card menu
            if (e.target.closest('.card-menu-btn')) {
                this.toggleCardMenu(e.target.closest('.card-menu-btn'));
            }
            
            // User card click
            if (e.target.closest('.user-card') && !e.target.closest('button')) {
                const userId = e.target.closest('.user-card').dataset.userId;
                this.showUserModal(userId);
            }
        });
    }
    
    switchTab(tabElement) {
        if (!tabElement) return;
        
        const tabName = tabElement.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabElement.classList.add('active');
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected section
        const section = document.getElementById(`${tabName}Section`);
        if (section) {
            section.style.display = 'block';
            this.animateContentIn(section);
        }
        
        this.currentTab = tabName;
        this.page = 1;
        this.loadUsers();
    }
    
    switchView(viewElement) {
        if (!viewElement) return;
        
        const viewType = viewElement.dataset.view;
        
        // Update active view
        document.querySelectorAll('.view-option').forEach(option => {
            option.classList.remove('active');
        });
        viewElement.classList.add('active');
        
        // Update grid class
        const grids = document.querySelectorAll('.users-grid');
        grids.forEach(grid => {
            grid.classList.toggle('list-view', viewType === 'list');
        });
        
        this.currentView = viewType;
    }
    
    async loadUsers() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Mock data based on current tab
            const newUsers = this.generateMockUsers();
            
            if (this.page === 1) {
                this.users = newUsers;
            } else {
                this.users = [...this.users, ...newUsers];
            }
            
            this.filterAndDisplayUsers();
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }
    
    filterAndDisplayUsers() {
        this.filteredUsers = this.users.filter(user => {
            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const matchesSearch = 
                    user.name.toLowerCase().includes(query) ||
                    user.username.toLowerCase().includes(query) ||
                    user.bio.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }
            
            // Location filter
            if (this.filters.location && user.location !== this.filters.location) {
                return false;
            }
            
            // Style filter
            if (this.filters.style && !user.styles.includes(this.filters.style)) {
                return false;
            }
            
            // Activity filter
            if (this.filters.activity && user.activityLevel !== this.filters.activity) {
                return false;
            }
            
            return true;
        });
        
        this.displayUsers();
    }
    
    displayUsers() {
        const grid = document.querySelector(`#${this.currentTab}Section .users-grid`);
        if (!grid) return;
        
        if (this.filteredUsers.length === 0) {
            grid.innerHTML = this.getEmptyStateHTML();
            return;
        }
        
        grid.innerHTML = this.filteredUsers.map(user => this.getUserCardHTML(user)).join('');
        this.animateCardsIn();
    }
    
    getUserCardHTML(user) {
        const isFollowing = user.isFollowing || false;
        const isMutual = user.isMutual || false;
        const isNew = user.isNew || false;
        
        return `
            <div class="user-card" data-user-id="${user.id}">
                <div class="card-header">
                    ${isMutual ? `
                        <div class="mutual-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="23" y1="11" x2="18.5" y2="11"></line>
                            </svg>
                            Follows you back
                        </div>
                    ` : isNew ? '<div class="new-follower-badge">New</div>' : '<div></div>'}
                    <button class="card-menu-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                </div>
                
                <div class="user-avatar-wrapper">
                    <img src="${user.avatar}" alt="${user.name}" class="user-avatar">
                    <div class="activity-indicator ${user.isActive ? 'active' : ''}"></div>
                </div>
                
                <h3 class="user-name">${user.name}</h3>
                <p class="user-username">@${user.username}</p>
                
                <p class="user-bio">${user.bio}</p>
                
                <div class="user-stats">
                    <div class="user-stat">
                        <span class="stat-value">${user.stats.miles}</span>
                        <span class="stat-label">miles/year</span>
                    </div>
                    <div class="user-stat">
                        <span class="stat-value">${user.stats.rides}</span>
                        <span class="stat-label">rides</span>
                    </div>
                    <div class="user-stat">
                        <span class="stat-value">${user.stats.badges}</span>
                        <span class="stat-label">badges</span>
                    </div>
                </div>
                
                <div class="user-tags">
                    ${user.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                
                <div class="user-actions">
                    ${isFollowing ? `
                        <button class="btn-secondary following" data-following="true">
                            <span class="following-text">Following</span>
                            <span class="unfollow-text">Unfollow</span>
                        </button>
                    ` : this.currentTab === 'followers' ? `
                        <button class="btn-primary follow-btn" data-following="false">
                            Follow Back
                        </button>
                    ` : `
                        <button class="btn-primary follow-btn" data-following="false">
                            Follow
                        </button>
                    `}
                    <button class="btn-icon message-btn" title="Send message">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }
    
    getEmptyStateHTML() {
        const emptyStates = {
            followers: {
                icon: '👥',
                title: 'No followers yet',
                text: 'Start connecting with other riders to grow your network',
                button: 'Find Riders to Follow'
            },
            following: {
                icon: '🚴',
                title: 'Not following anyone',
                text: 'Discover amazing riders and follow their journeys',
                button: 'Explore Riders'
            },
            suggested: {
                icon: '🔍',
                title: 'No suggestions available',
                text: 'Check back later for personalized rider recommendations',
                button: 'Browse All Riders'
            },
            requests: {
                icon: '📬',
                title: 'No pending requests',
                text: 'All follow requests have been handled',
                button: null
            }
        };
        
        const state = emptyStates[this.currentTab] || emptyStates.followers;
        
        return `
            <div class="empty-state">
                <div class="empty-icon">${state.icon}</div>
                <h3 class="empty-title">${state.title}</h3>
                <p class="empty-text">${state.text}</p>
                ${state.button ? `<button class="btn-primary">${state.button}</button>` : ''}
            </div>
        `;
    }
    
    generateMockUsers() {
        const names = [
            'Sarah Chen', 'Mike Johnson', 'Emily Rodriguez', 'David Kim', 
            'Lisa Anderson', 'James Wilson', 'Maria Garcia', 'Robert Taylor',
            'Jennifer Lee', 'Chris Martinez', 'Amanda White', 'Daniel Brown'
        ];
        
        const bios = [
            'Century rider and coffee enthusiast ☕ Always chasing sunrise rides',
            'Mountain biking is life 🏔️ Trail builder and adventure seeker',
            'Gravel grinding and bikepacking across the country 🌎',
            'Commuter by day, weekend warrior by night 🚴‍♂️',
            'Racing crits and loving every pedal stroke 🏁',
            'Bike mechanic and vintage steel collector 🔧',
            'Endurance athlete pushing limits one mile at a time 💪',
            'Family rides and community advocacy 👨‍👩‍👧‍👦'
        ];
        
        const tags = [
            ['Road Cycling', 'Century Rides'],
            ['Mountain Biking', 'Trail Building'],
            ['Gravel', 'Bikepacking'],
            ['Commuting', 'Urban Cycling'],
            ['Racing', 'Criteriums'],
            ['Bike Maintenance', 'Vintage Bikes'],
            ['Endurance', 'Ultra Cycling'],
            ['Family Rides', 'Advocacy']
        ];
        
        return Array.from({ length: this.perPage }, (_, i) => {
            const index = (this.page - 1) * this.perPage + i;
            const nameIndex = index % names.length;
            
            return {
                id: `user-${Date.now()}-${i}`,
                name: names[nameIndex],
                username: names[nameIndex].toLowerCase().replace(' ', ''),
                avatar: '/assets/images/bikenode_logo.png',
                bio: bios[nameIndex % bios.length],
                isActive: Math.random() > 0.5,
                isFollowing: this.currentTab === 'following' || Math.random() > 0.7,
                isMutual: Math.random() > 0.6,
                isNew: Math.random() > 0.8,
                stats: {
                    miles: `${(Math.random() * 3 + 0.5).toFixed(1)}k`,
                    rides: Math.floor(Math.random() * 200 + 50),
                    badges: Math.floor(Math.random() * 50 + 10)
                },
                tags: tags[nameIndex % tags.length],
                location: ['nearby', 'city', 'state', 'country'][Math.floor(Math.random() * 4)],
                styles: tags[nameIndex % tags.length],
                activityLevel: ['daily', 'weekly', 'weekend', 'occasional'][Math.floor(Math.random() * 4)]
            };
        });
    }
    
    sortUsers(sortBy) {
        const sortFunctions = {
            recent: (a, b) => b.lastActive - a.lastActive,
            name: (a, b) => a.name.localeCompare(b.name),
            mutual: (a, b) => (b.isMutual ? 1 : 0) - (a.isMutual ? 1 : 0),
            miles: (a, b) => parseFloat(b.stats.miles) - parseFloat(a.stats.miles),
            joined: (a, b) => b.joinedDate - a.joinedDate
        };
        
        if (sortFunctions[sortBy]) {
            this.filteredUsers.sort(sortFunctions[sortBy]);
            this.displayUsers();
        }
    }
    
    applyFilters() {
        this.filters = {
            location: document.querySelector('[name="location"]')?.value || '',
            style: document.querySelector('[name="style"]')?.value || '',
            activity: document.querySelector('[name="activity"]')?.value || ''
        };
        
        this.filterAndDisplayUsers();
    }
    
    clearFilters() {
        document.querySelectorAll('.filter-select').forEach(select => {
            select.value = '';
        });
        
        this.filters = {
            location: '',
            style: '',
            activity: ''
        };
        
        this.filterAndDisplayUsers();
        
        // Hide advanced filters
        document.getElementById('advancedFilters').style.display = 'none';
    }
    
    loadMore() {
        this.page++;
        this.loadUsers();
    }
    
    toggleFollow(button) {
        const isFollowing = button.dataset.following === 'true';
        
        button.disabled = true;
        button.classList.add('loading');
        
        // Simulate API call
        setTimeout(() => {
            button.dataset.following = !isFollowing;
            
            if (!isFollowing) {
                button.className = 'btn-secondary following';
                button.innerHTML = `
                    <span class="following-text">Following</span>
                    <span class="unfollow-text">Unfollow</span>
                `;
                this.showToast('Now following!');
            } else {
                button.className = 'btn-primary follow-btn';
                button.textContent = this.currentTab === 'followers' ? 'Follow Back' : 'Follow';
                this.showToast('Unfollowed');
            }
            
            button.disabled = false;
            button.classList.remove('loading');
            
            // Update stats
            this.updateStats();
        }, 500);
    }
    
    showUserModal(userId) {
        // Implementation for showing user details modal
        console.log('Show user modal for:', userId);
    }
    
    showMessageModal(userId) {
        // Implementation for showing message modal
        console.log('Show message modal for:', userId);
    }
    
    showInviteModal() {
        // Implementation for showing invite modal
        console.log('Show invite modal');
    }
    
    toggleCardMenu(button) {
        // Implementation for card menu
        console.log('Toggle card menu');
    }
    
    updateStats() {
        // Update the stats in the header
        const stats = document.querySelectorAll('.stat-value');
        stats.forEach(stat => {
            const current = parseInt(stat.textContent.replace(/[^0-9]/g, ''));
            const change = Math.random() > 0.5 ? 1 : -1;
            stat.textContent = current + change;
        });
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    initializeAnimations() {
        // Add stagger animation to cards on load
        this.animateCardsIn();
        
        // Animate stats
        this.animateStats();
    }
    
    animateCardsIn() {
        const cards = document.querySelectorAll('.user-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
    
    animateContentIn(section) {
        section.style.opacity = '0';
        section.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            section.style.transition = 'all 0.3s ease';
            section.style.opacity = '1';
            section.style.transform = 'translateX(0)';
        }, 10);
    }
    
    animateStats() {
        const stats = document.querySelectorAll('.stat-value');
        stats.forEach(stat => {
            const target = parseInt(stat.textContent.replace(/[^0-9]/g, ''));
            let current = 0;
            const increment = target / 30;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                
                if (stat.textContent.includes('k')) {
                    stat.textContent = (current / 1000).toFixed(1) + 'k';
                } else {
                    stat.textContent = Math.floor(current);
                }
            }, 30);
        });
    }
    
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, options);
        
        // Observe sidebar cards
        document.querySelectorAll('.sidebar-card').forEach(card => {
            observer.observe(card);
        });
    }
    
    showLoadingState() {
        const loadMoreBtn = document.getElementById('loadMoreFollowers');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.disabled = true;
        }
    }
    
    hideLoadingState() {
        const loadMoreBtn = document.getElementById('loadMoreFollowers');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Load More';
            loadMoreBtn.disabled = false;
        }
    }
    
    showErrorState() {
        this.showToast('Error loading users. Please try again.');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new FollowingApp();
});