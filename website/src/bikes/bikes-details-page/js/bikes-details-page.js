// Bikes Details Page JavaScript

// Tab functionality
function bikesDetailsPageInitTabs() {
    document.querySelectorAll('.bikes-details-page-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.bikes-details-page-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.bikes-details-page-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById('bikes-details-page-' + tabId).classList.add('active');
        });
    });
}

// Action menu toggle
function bikesDetailsPageToggleActionMenu() {
    const dropdown = document.getElementById('bikes-details-page-action-dropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
function bikesDetailsPageInitDropdown() {
    document.addEventListener('click', function(e) {
        const actionMenu = document.querySelector('.bikes-details-page-action-menu');
        const dropdown = document.getElementById('bikes-details-page-action-dropdown');
        
        if (actionMenu && !actionMenu.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// Photo modal functionality
function bikesDetailsPageOpenPhotoModal(src) {
    const modal = document.getElementById('bikes-details-page-photo-modal');
    const modalImg = document.getElementById('bikes-details-page-modal-image');
    modal.style.display = 'block';
    modalImg.src = src;
}

function bikesDetailsPageClosePhotoModal() {
    document.getElementById('bikes-details-page-photo-modal').style.display = 'none';
}

// Mock button functionality (excluding links)
function bikesDetailsPageInitButtons() {
    document.querySelectorAll('button.bikes-details-page-btn-primary, button.bikes-details-page-btn-secondary, .bikes-details-page-dropdown-item').forEach(btn => {
        // Skip if it's a link (anchor tag)
        if (btn.tagName === 'A' && btn.href) return;
        
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.textContent.trim();
            alert(`${action} functionality would be implemented here!`);
        });
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    bikesDetailsPageInitTabs();
    bikesDetailsPageInitDropdown();
    bikesDetailsPageInitButtons();
    
    // Set up photo modal close on click
    const modal = document.getElementById('bikes-details-page-photo-modal');
    if (modal) {
        modal.addEventListener('click', bikesDetailsPageClosePhotoModal);
    }
});