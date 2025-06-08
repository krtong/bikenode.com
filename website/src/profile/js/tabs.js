// Tab functionality module
export function initializeTabs() {
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => {
                c.classList.remove('active');
            });
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(`${tabId}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Load specific content for certain tabs
                if (tabId === 'garage') {
                    loadGarageContent();
                }
            }
            
            // Update URL without page reload
            history.pushState(null, null, `#${tabId}`);
        });
    });
    
    // Load tab from URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
        const tabBtn = document.querySelector(`[data-tab="${hash}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
    }
}

// Quick navigation functions
export function switchToTab(tabName) {
    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.click();
    }
}

// Function to update garage stats
function updateGarageStats() {
    // This would normally fetch from an API
    // Stats now focus on journey and experiences, not monetary value
    const statsElements = {
        'totalBikes': '12',
        'totalMiles': '45,678',
        'memoriesCaptured': '234',
        'yearsRiding': '8',
        'mostLoyal': 'BMW R1250GS',
        'distanceChampion': '15,678 miles',
        'speedDemon': 'Ducati V4S',
        'nextService': 'Yamaha R1'
    };
    
    Object.entries(statsElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Load garage content when garage tab is selected
function loadGarageContent() {
    updateGarageStats();
    // Additional garage loading logic would go here
}

// Make switchToTab available globally
window.switchToTab = switchToTab;