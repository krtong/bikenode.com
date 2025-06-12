// profile-following-list.js

// Filter functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.profile-following-list-filter-btn');
    const searchInput = document.querySelector('.profile-following-list-search');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Filter logic would go here
        });
    });

    // Search functionality
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        // Search logic would go here
    });

    // Following/Unfollow toggle
    const followBtns = document.querySelectorAll('.profile-following-list-action-btn');
    followBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('following')) {
                this.classList.remove('following');
                this.textContent = 'Follow';
            } else {
                this.classList.add('following');
                this.textContent = 'Following';
            }
        });
    });
});