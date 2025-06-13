// Profile My Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const profileMyPageTabs = document.querySelectorAll('.profile-my-page-tab');
    const profileMyPagePanels = document.querySelectorAll('.profile-my-page-tab-panel');
    
    profileMyPageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanel = tab.getAttribute('data-tab');
            
            // Update active tab
            profileMyPageTabs.forEach(t => t.classList.remove('profile-my-page-tab-active'));
            tab.classList.add('profile-my-page-tab-active');
            
            // Show correct panel
            profileMyPagePanels.forEach(panel => {
                if (panel.getAttribute('data-panel') === targetPanel) {
                    panel.classList.add('profile-my-page-tab-panel-active');
                } else {
                    panel.classList.remove('profile-my-page-tab-panel-active');
                }
            });
        });
    });
    
    // Edit cover photo
    const profileMyPageEditCoverBtn = document.querySelector('.profile-my-page-edit-cover-btn');
    if (profileMyPageEditCoverBtn) {
        profileMyPageEditCoverBtn.addEventListener('click', () => {
            // Placeholder for cover photo upload
            console.log('Edit cover photo clicked');
        });
    }
    
    // Edit avatar
    const profileMyPageEditAvatarBtn = document.querySelector('.profile-my-page-edit-avatar-btn');
    if (profileMyPageEditAvatarBtn) {
        profileMyPageEditAvatarBtn.addEventListener('click', () => {
            // Placeholder for avatar upload
            console.log('Edit avatar clicked');
        });
    }
    
    // Share profile
    const profileMyPageShareBtn = document.querySelector('.profile-my-page-btn-secondary');
    if (profileMyPageShareBtn) {
        profileMyPageShareBtn.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: 'My BikeNode Profile',
                    text: 'Check out my BikeNode profile!',
                    url: window.location.href
                }).catch(err => console.log('Error sharing:', err));
            } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('Profile link copied to clipboard!');
                });
            }
        });
    }
    
    // Animate stats on scroll
    const profileMyPageStatsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.profile-my-page-stat-number');
                statNumbers.forEach(stat => {
                    const finalValue = parseInt(stat.textContent.replace(/,/g, ''));
                    animateValue(stat, 0, finalValue, 1000);
                });
                profileMyPageStatsObserver.unobserve(entry.target);
            }
        });
    });
    
    const profileMyPageStatsGrid = document.querySelector('.profile-my-page-stats-grid');
    if (profileMyPageStatsGrid) {
        profileMyPageStatsObserver.observe(profileMyPageStatsGrid);
    }
    
    // Number animation function
    function animateValue(element, start, end, duration) {
        const startTimestamp = Date.now();
        const step = () => {
            const progress = Math.min((Date.now() - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value.toLocaleString();
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }
});