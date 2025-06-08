// Profile actions module
import { showToast } from './toast.js';
import { viewGarage, viewPosts, viewEvents, viewAchievements } from './tabs.js';

// Profile Actions
export function sendMessage() {
    showToast('Opening message composer...', 'info');
    // Simulate opening message interface
    setTimeout(() => {
        showToast('Message interface ready!', 'success');
    }, 1000);
}

export function toggleFollow() {
    const btn = document.querySelector('.follow-btn');
    const isFollowing = btn.dataset.following === 'true';
    const text = btn.querySelector('.follow-text');
    const icon = btn.querySelector('.icon');
    
    if (isFollowing) {
        btn.dataset.following = 'false';
        text.textContent = 'Follow';
        icon.textContent = '👤';
        btn.classList.remove('following');
        showToast('Unfollowed Kevin Tong', 'info');
    } else {
        btn.dataset.following = 'true';
        text.textContent = 'Following';
        icon.textContent = '✓';
        btn.classList.add('following');
        showToast('Now following Kevin Tong!', 'success');
    }
}

export function addToFriends() {
    showToast('Friend request sent!', 'success');
}

export function shareProfile() {
    document.getElementById('shareModal').style.display = 'flex';
}

export function reportUser() {
    showToast('Report form opened', 'warning');
}

export function blockUser() {
    if (confirm('Are you sure you want to block this user?')) {
        showToast('User blocked successfully', 'error');
    }
}

export function exportProfile() {
    showToast('Preparing profile export...', 'info');
    setTimeout(() => {
        showToast('Profile exported! Check your downloads.', 'success');
    }, 2000);
}

export function copyProfileLink() {
    navigator.clipboard.writeText('https://bikenode.com/profile/krtong').then(() => {
        showToast('Profile link copied to clipboard!', 'success');
    });
}

export function startChat() {
    showToast('Opening chat window...', 'info');
}

// Action menu toggle
export function toggleActionMenu() {
    const dropdown = document.getElementById('action-dropdown');
    dropdown.classList.toggle('active');
}

// Initialize action menu
export function initializeActionMenu() {
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const actionMenu = document.querySelector('.action-menu');
        const dropdown = document.getElementById('action-dropdown');
        
        if (actionMenu && !actionMenu.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// Make functions globally available
window.sendMessage = sendMessage;
window.toggleFollow = toggleFollow;
window.addToFriends = addToFriends;
window.shareProfile = shareProfile;
window.reportUser = reportUser;
window.blockUser = blockUser;
window.exportProfile = exportProfile;
window.copyProfileLink = copyProfileLink;
window.toggleActionMenu = toggleActionMenu;
window.viewGarage = viewGarage;
window.viewPosts = viewPosts;
window.viewEvents = viewEvents;
window.viewAchievements = viewAchievements;
window.startChat = startChat;