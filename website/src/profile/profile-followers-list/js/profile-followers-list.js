// Profile Followers List Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize profile followers list functionality
    profileFollowersListInit();
});

function profileFollowersListInit() {
    // Filter functionality
    profileFollowersListInitFilters();
    
    // Search functionality
    profileFollowersListInitSearch();
    
    // Follow/Unfollow actions
    profileFollowersListInitFollowActions();
    
    // Load more functionality
    profileFollowersListInitLoadMore();
    
    // More menu actions
    profileFollowersListInitMoreActions();
}

// Filter Functionality
function profileFollowersListInitFilters() {
    const filterButtons = document.querySelectorAll('.profile-followers-list-filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get filter type
            const filterType = this.getAttribute('data-filter');
            
            // Apply filter (would typically make API call here)
            profileFollowersListApplyFilter(filterType);
        });
    });
}

function profileFollowersListApplyFilter(filterType) {
    console.log('Applying filter:', filterType);
    // In a real implementation, this would:
    // 1. Show loading state
    // 2. Make API call with filter parameter
    // 3. Update the grid with filtered results
    // 4. Update stats if needed
}

// Search Functionality
function profileFollowersListInitSearch() {
    const searchInput = document.querySelector('.profile-followers-list-search');
    let searchTimeout;
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value;
            
            // Debounce search
            searchTimeout = setTimeout(() => {
                profileFollowersListPerformSearch(searchTerm);
            }, 300);
        });
    }
}

function profileFollowersListPerformSearch(searchTerm) {
    console.log('Searching for:', searchTerm);
    // In a real implementation, this would:
    // 1. Show loading state
    // 2. Make API call with search parameter
    // 3. Update the grid with search results
}

// Follow/Unfollow Actions
function profileFollowersListInitFollowActions() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('profile-followers-list-action-btn')) {
            e.preventDefault();
            const button = e.target;
            const isFollowing = button.classList.contains('following');
            const isFollowBack = button.classList.contains('follow-back');
            
            if (isFollowing) {
                profileFollowersListUnfollow(button);
            } else if (isFollowBack) {
                profileFollowersListFollowBack(button);
            }
        }
    });
}

function profileFollowersListFollowBack(button) {
    // In a real implementation, this would make an API call
    console.log('Following user back');
    
    // Update button state
    button.classList.remove('follow-back');
    button.classList.add('following');
    button.textContent = 'Following';
    
    // Update mutual tag if needed
    const card = button.closest('.profile-followers-list-card');
    const tagsContainer = card.querySelector('.profile-followers-list-tags');
    
    // Check if mutual tag already exists
    const hasMutualTag = tagsContainer.querySelector('.profile-followers-list-tag.mutual');
    
    if (!hasMutualTag) {
        const mutualTag = document.createElement('span');
        mutualTag.className = 'profile-followers-list-tag mutual';
        mutualTag.textContent = 'Mutual';
        tagsContainer.appendChild(mutualTag);
    }
}

function profileFollowersListUnfollow(button) {
    // In a real implementation, this would show a confirmation dialog
    const confirmUnfollow = confirm('Are you sure you want to unfollow this user?');
    
    if (confirmUnfollow) {
        console.log('Unfollowing user');
        
        // Update button state
        button.classList.remove('following');
        button.classList.add('follow-back');
        button.textContent = 'Follow Back';
        
        // Remove mutual tag if it exists
        const card = button.closest('.profile-followers-list-card');
        const mutualTag = card.querySelector('.profile-followers-list-tag.mutual');
        
        if (mutualTag) {
            mutualTag.remove();
        }
    }
}

// Load More Functionality
function profileFollowersListInitLoadMore() {
    const loadMoreBtn = document.querySelector('.profile-followers-list-load-more button');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            profileFollowersListLoadMore();
        });
    }
}

function profileFollowersListLoadMore() {
    console.log('Loading more followers');
    
    // In a real implementation, this would:
    // 1. Show loading state on button
    // 2. Make API call for next page
    // 3. Append new cards to grid
    // 4. Update button state or hide if no more results
    
    const button = document.querySelector('.profile-followers-list-load-more button');
    button.textContent = 'Loading...';
    button.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        button.textContent = 'Load More';
        button.disabled = false;
    }, 1000);
}

// More Actions Menu
function profileFollowersListInitMoreActions() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.profile-followers-list-more-btn')) {
            e.preventDefault();
            const button = e.target.closest('.profile-followers-list-more-btn');
            profileFollowersListShowMoreMenu(button);
        }
    });
}

function profileFollowersListShowMoreMenu(button) {
    console.log('Showing more actions menu');
    // In a real implementation, this would show a dropdown menu with options like:
    // - Remove follower
    // - Block user
    // - Report user
    // - View profile
}

// Helper function to format numbers
function profileFollowersListFormatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

// Message button functionality
document.addEventListener('click', function(e) {
    if (e.target.closest('.profile-followers-list-message-btn')) {
        e.preventDefault();
        const button = e.target.closest('.profile-followers-list-message-btn');
        const card = button.closest('.profile-followers-list-card');
        const username = card.querySelector('.profile-followers-list-username').textContent;
        
        console.log('Opening message with:', username);
        // In a real implementation, this would open the messaging interface
    }
});