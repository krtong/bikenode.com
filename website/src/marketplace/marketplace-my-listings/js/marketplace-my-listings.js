// marketplace-my-listings.js
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabs = document.querySelectorAll('.marketplace-my-listings-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('marketplace-my-listings-tab-active'));
            
            // Add active class to clicked tab
            this.classList.add('marketplace-my-listings-tab-active');
            
            // Filter listings based on tab
            const status = this.getAttribute('data-status');
            console.log('Filtering by status:', status);
            filterListings(status);
        });
    });

    // Edit listing buttons
    const editButtons = document.querySelectorAll('[data-action="edit"]');
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            const listingId = this.getAttribute('data-listing-id');
            console.log('Edit listing:', listingId);
            // Add edit functionality here
        });
    });

    // View stats buttons
    const viewButtons = document.querySelectorAll('[data-action="view"]');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const listingId = this.getAttribute('data-listing-id');
            console.log('View listing stats:', listingId);
            // Add view stats functionality here
        });
    });

    // Delete listing buttons
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const listingId = this.getAttribute('data-listing-id');
            if (confirm('Are you sure you want to delete this listing?')) {
                console.log('Delete listing:', listingId);
                // Add delete functionality here
            }
        });
    });

    // Create new listing button
    const createButton = document.querySelector('.marketplace-my-listings-create-button');
    if (createButton) {
        createButton.addEventListener('click', function(e) {
            console.log('Create new listing');
            // Navigation is handled by the link
        });
    }

    // Filter listings function
    function filterListings(status) {
        const rows = document.querySelectorAll('.marketplace-my-listings-table tbody tr');
        
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const rowStatus = row.getAttribute('data-status');
                row.style.display = rowStatus === status ? '' : 'none';
            }
        });
    }
});