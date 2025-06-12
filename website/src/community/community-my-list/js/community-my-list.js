// Community My List Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.community-my-list-tab-btn');
    const tabContents = document.querySelectorAll('.community-my-list-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('community-my-list-tab-active'));
            tab.classList.add('community-my-list-tab-active');
            
            // Show correct content
            tabContents.forEach(content => {
                if (content.id === `community-my-list-${targetTab}-tab`) {
                    content.classList.remove('community-my-list-hidden');
                } else {
                    content.classList.add('community-my-list-hidden');
                }
            });
        });
    });
});