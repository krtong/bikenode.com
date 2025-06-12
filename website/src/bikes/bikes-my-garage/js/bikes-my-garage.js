// Bikes My Garage JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const bikesMyGarageTabs = document.querySelectorAll('.bikes-my-garage-tab');
    const bikesMyGarageTabContents = document.querySelectorAll('.bikes-my-garage-tab-content');
    
    bikesMyGarageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Update active tab
            bikesMyGarageTabs.forEach(t => t.classList.remove('bikes-my-garage-tab-active'));
            tab.classList.add('bikes-my-garage-tab-active');
            
            // Show correct content
            bikesMyGarageTabContents.forEach(content => {
                if (content.getAttribute('data-tab-content') === targetTab) {
                    content.classList.add('bikes-my-garage-tab-active');
                } else {
                    content.classList.remove('bikes-my-garage-tab-active');
                }
            });
        });
    });
    
    // View toggle
    const bikesMyGarageViewBtns = document.querySelectorAll('.bikes-my-garage-view-btn');
    bikesMyGarageViewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            bikesMyGarageViewBtns.forEach(b => b.classList.remove('bikes-my-garage-view-active'));
            btn.classList.add('bikes-my-garage-view-active');
            
            const view = btn.getAttribute('data-view');
            const grid = document.getElementById('bikes-my-garage-bikes-grid');
            
            if (view === 'list') {
                grid.classList.add('bikes-my-garage-list-view');
            } else {
                grid.classList.remove('bikes-my-garage-list-view');
            }
        });
    });
    
    // Search functionality
    const bikesMyGarageSearchInput = document.getElementById('bikes-my-garage-search');
    if (bikesMyGarageSearchInput) {
        bikesMyGarageSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            // Implement search logic
        });
    }
});
EOF < /dev/null