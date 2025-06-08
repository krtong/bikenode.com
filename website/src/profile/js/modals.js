// Modal functionality module
import { viewGarage, viewPosts } from './tabs.js';

export function showModal(type) {
    const modal = document.getElementById('profileModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    
    let content = '';
    
    switch(type) {
        case 'followers':
            title.textContent = 'Followers (156)';
            content = generateUsersList('followers');
            break;
        case 'following':
            title.textContent = 'Following (203)';
            content = generateUsersList('following');
            break;
        case 'communities':
            title.textContent = 'Communities (8)';
            content = generateCommunitiesList();
            break;
        case 'garage':
            viewGarage();
            return;
        case 'posts':
            viewPosts();
            return;
        case 'achievements':
            title.textContent = 'Achievements (24)';
            content = generateAchievementsList();
            break;
    }
    
    body.innerHTML = content;
    modal.style.display = 'flex';
}

export function closeModal() {
    document.getElementById('profileModal').style.display = 'none';
}

export function closeFollowersModal() {
    document.getElementById('followersModal').style.display = 'none';
}

export function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

// Generate content for modals
function generateUsersList(type) {
    const users = [
        { name: 'SpeedDemon23', username: '@speeddemon', avatar: '🏍️', status: 'online' },
        { name: 'MountainRider', username: '@mtbiker', avatar: '🚵', status: 'offline' },
        { name: 'TrackDayPro', username: '@trackpro', avatar: '🏁', status: 'online' },
        { name: 'CruiserKing', username: '@cruiser', avatar: '🛣️', status: 'away' }
    ];
    
    return `
        <div class="users-grid">
            ${users.map(user => `
                <div class="user-item">
                    <div class="user-avatar">${user.avatar}</div>
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        <div class="user-username">${user.username}</div>
                    </div>
                    <div class="user-status ${user.status}"></div>
                    <button class="btn-secondary small">View</button>
                </div>
            `).join('')}
        </div>
    `;
}

function generateCommunitiesList() {
    const communities = [
        { name: 'Sport Bike Riders', members: '1,234', role: 'Admin', icon: '🏍️' },
        { name: 'Track Day Warriors', members: '567', role: 'Moderator', icon: '🏁' },
        { name: 'Bay Area Riders', members: '892', role: 'Member', icon: '🛣️' },
        { name: 'Motorcycle Mechanics', members: '445', role: 'Member', icon: '🔧' }
    ];
    
    return `
        <div class="communities-grid">
            ${communities.map(community => `
                <div class="community-item">
                    <div class="community-icon">${community.icon}</div>
                    <div class="community-info">
                        <div class="community-name">${community.name}</div>
                        <div class="community-meta">${community.members} members</div>
                    </div>
                    <div class="community-role ${community.role.toLowerCase()}">${community.role}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function generateAchievementsList() {
    const achievements = [
        { name: 'First Bike', description: 'Added your first bike to the garage', icon: '🏍️', date: 'Mar 15, 2024', rarity: 'common' },
        { name: 'Track Enthusiast', description: 'Attended your first track day', icon: '🏁', date: 'Nov 20, 2024', rarity: 'rare' },
        { name: 'Community Leader', description: 'Became a moderator', icon: '👑', date: 'Aug 12, 2024', rarity: 'epic' },
        { name: 'Speed Demon', description: 'Reached Group A level', icon: '⚡', date: 'Dec 5, 2024', rarity: 'legendary' }
    ];
    
    return `
        <div class="achievements-grid">
            ${achievements.map(achievement => `
                <div class="achievement-item ${achievement.rarity}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-date">Earned ${achievement.date}</div>
                    </div>
                    <div class="achievement-rarity ${achievement.rarity}">${achievement.rarity}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Share Functions
export function shareToDiscord() {
    import('./toast.js').then(({ showToast }) => {
        showToast('Opening Discord share...', 'info');
    });
}

export function shareToTwitter() {
    const text = encodeURIComponent('Check out Kevin Tong\'s BikeNode profile!');
    const url = encodeURIComponent('https://bikenode.com/profile/krtong');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

export function shareByEmail() {
    const subject = encodeURIComponent('Check out this BikeNode profile');
    const body = encodeURIComponent('I thought you might be interested in Kevin Tong\'s BikeNode profile: https://bikenode.com/profile/krtong');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function copyToClipboard() {
    const input = document.querySelector('.link-input');
    input.select();
    document.execCommand('copy');
    import('./toast.js').then(({ showToast }) => {
        showToast('Link copied to clipboard!', 'success');
    });
}

// Initialize modal click handlers
export function initializeModals() {
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        const modals = ['profileModal', 'followersModal', 'shareModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Make functions globally available
window.showModal = showModal;
window.closeModal = closeModal;
window.closeFollowersModal = closeFollowersModal;
window.closeShareModal = closeShareModal;
window.shareToDiscord = shareToDiscord;
window.shareToTwitter = shareToTwitter;
window.shareByEmail = shareByEmail;
window.copyToClipboard = copyToClipboard;