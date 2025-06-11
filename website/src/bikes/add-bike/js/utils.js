// Utility functions

// Initialize the application
export function initializeApp() {
    console.log('Initializing Add Bike V2...');
    
    // Set initial state
    showStage('type');
    
    // Initialize any UI components
    initializeTooltips();
}

// Update breadcrumb navigation
export function updateBreadcrumb(items) {
    const breadcrumb = document.getElementById('v2-breadcrumb');
    if (!breadcrumb) return;
    
    breadcrumb.innerHTML = items.map((item, index) => {
        const isLast = index === items.length - 1;
        return `<span class="breadcrumb-item ${isLast ? 'active' : ''}">${item}</span>`;
    }).join('<span class="breadcrumb-separator"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><polyline points="9 18 15 12 9 6"></polyline></svg></span>');
}

// Show a specific stage
export function showStage(stageName) {
    // Hide all stages
    document.querySelectorAll('.content-stage').forEach(stage => {
        stage.classList.remove('active');
    });
    
    // Show the requested stage
    const stage = document.getElementById(`stage-${stageName}`);
    if (stage) {
        stage.classList.add('active');
        
        // Animate entrance
        stage.style.opacity = '0';
        stage.style.transform = 'translateY(20px)';
        setTimeout(() => {
            stage.style.transition = 'all 0.3s ease';
            stage.style.opacity = '1';
            stage.style.transform = 'translateY(0)';
        }, 10);
    }
}

// Show loading overlay
export function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = overlay?.querySelector('.loading-text');
    
    if (overlay) {
        if (loadingText) {
            loadingText.textContent = message;
        }
        overlay.classList.add('active');
    }
}

// Hide loading overlay
export function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Initialize tooltips
function initializeTooltips() {
    // Add tooltip functionality if needed
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const text = e.target.dataset.tooltip;
    if (!text) return;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
    tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;
    
    e.target._tooltip = tooltip;
}

function hideTooltip(e) {
    if (e.target._tooltip) {
        e.target._tooltip.remove();
        delete e.target._tooltip;
    }
}

// Format number with commas
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Debounce function for search inputs
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Title case conversion
export function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}