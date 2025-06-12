// Rides Route Details Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize route details functionality
    ridesRouteDetailsInit();
});

function ridesRouteDetailsInit() {
    // Initialize map
    ridesRouteDetailsInitMap();
    
    // Initialize elevation chart
    ridesRouteDetailsInitElevationChart();
    
    // Initialize save button
    ridesRouteDetailsInitSaveButton();
    
    // Initialize map controls
    ridesRouteDetailsInitMapControls();
    
    // Initialize review functionality
    ridesRouteDetailsInitReviews();
    
    // Initialize action buttons
    ridesRouteDetailsInitActions();
}

// Map Initialization
function ridesRouteDetailsInitMap() {
    const mapElement = document.getElementById('rides-route-details-map');
    
    if (mapElement) {
        // In a real implementation, this would initialize a map library
        console.log('Initializing route map');
        
        // Remove placeholder
        const placeholder = mapElement.querySelector('.rides-route-details-map-placeholder');
        if (placeholder) {
            setTimeout(() => {
                placeholder.style.display = 'none';
                // Simulate map loading
                mapElement.style.background = 'url("/assets/images/route-map-placeholder.jpg") center/cover';
            }, 1000);
        }
    }
}

// Map Controls
function ridesRouteDetailsInitMapControls() {
    const mapButtons = document.querySelectorAll('.rides-route-details-map-button');
    
    mapButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            mapButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get map type
            const mapType = this.getAttribute('data-action');
            
            // Change map view (in real implementation)
            ridesRouteDetailsChangeMapView(mapType);
        });
    });
}

function ridesRouteDetailsChangeMapView(mapType) {
    console.log('Changing map view to:', mapType);
    // In a real implementation, this would change the map layer/view
}

// Elevation Chart
function ridesRouteDetailsInitElevationChart() {
    const chartCanvas = document.getElementById('rides-route-details-elevation-chart');
    
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        
        // Set canvas size
        chartCanvas.width = chartCanvas.offsetWidth;
        chartCanvas.height = chartCanvas.offsetHeight;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, chartCanvas.height);
        gradient.addColorStop(0, 'rgba(88, 101, 242, 0.3)');
        gradient.addColorStop(1, 'rgba(88, 101, 242, 0.0)');
        
        // Draw elevation profile
        ctx.fillStyle = gradient;
        ctx.strokeStyle = 'rgba(88, 101, 242, 0.8)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, chartCanvas.height - 20);
        
        // Generate elevation points
        const points = [];
        for (let i = 0; i <= chartCanvas.width; i += 10) {
            const progress = i / chartCanvas.width;
            // Simulate elevation changes
            let height = chartCanvas.height - 40;
            
            if (progress < 0.2) {
                height -= Math.sin(progress * 5 * Math.PI) * 30;
            } else if (progress < 0.5) {
                height -= 60 + Math.sin((progress - 0.2) * 3 * Math.PI) * 40;
            } else if (progress < 0.8) {
                height -= 40 + Math.sin((progress - 0.5) * 4 * Math.PI) * 50;
            } else {
                height -= Math.sin((progress - 0.8) * 5 * Math.PI) * 20;
            }
            
            ctx.lineTo(i, height);
            points.push({ x: i, y: height });
        }
        
        // Complete the path
        ctx.lineTo(chartCanvas.width, chartCanvas.height - 20);
        ctx.lineTo(0, chartCanvas.height - 20);
        ctx.closePath();
        
        // Fill and stroke
        ctx.fill();
        ctx.stroke();
        
        // Add grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i < 5; i++) {
            const y = (chartCanvas.height / 5) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(chartCanvas.width, y);
            ctx.stroke();
        }
    }
}

// Save Button
function ridesRouteDetailsInitSaveButton() {
    const saveButton = document.querySelector('.rides-route-details-save-button');
    
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            this.classList.toggle('saved');
            
            if (this.classList.contains('saved')) {
                ridesRouteDetailsSaveRoute();
            } else {
                ridesRouteDetailsUnsaveRoute();
            }
        });
    }
}

function ridesRouteDetailsSaveRoute() {
    console.log('Saving route');
    // In a real implementation, this would make an API call
    
    // Show notification
    ridesRouteDetailsShowNotification('Route saved to your collection');
}

function ridesRouteDetailsUnsaveRoute() {
    console.log('Removing route from saved');
    // In a real implementation, this would make an API call
    
    // Show notification
    ridesRouteDetailsShowNotification('Route removed from your collection');
}

// Reviews
function ridesRouteDetailsInitReviews() {
    const addReviewBtn = document.querySelector('.rides-route-details-add-review');
    
    if (addReviewBtn) {
        addReviewBtn.addEventListener('click', function() {
            ridesRouteDetailsOpenReviewModal();
        });
    }
}

function ridesRouteDetailsOpenReviewModal() {
    console.log('Opening review modal');
    
    // In a real implementation, this would open a modal
    // For now, we'll create a simple inline form
    const reviewsSection = document.querySelector('.rides-route-details-reviews');
    
    if (reviewsSection) {
        // Create review form
        const reviewForm = document.createElement('div');
        reviewForm.className = 'rides-route-details-review-form';
        reviewForm.innerHTML = `
            <h4 style="margin: 0 0 1rem 0; color: var(--text-primary);">Write a Review</h4>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">Rating</label>
                <div class="rides-route-details-rating-input" style="font-size: 1.5rem; color: #f59e0b;">
                    <span data-rating="1" style="cursor: pointer;">☆</span>
                    <span data-rating="2" style="cursor: pointer;">☆</span>
                    <span data-rating="3" style="cursor: pointer;">☆</span>
                    <span data-rating="4" style="cursor: pointer;">☆</span>
                    <span data-rating="5" style="cursor: pointer;">☆</span>
                </div>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">Your Review</label>
                <textarea style="width: 100%; min-height: 100px; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: var(--text-primary); font-family: inherit; font-size: 0.875rem;"></textarea>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="rides-route-details-submit-review" style="padding: 0.75rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;">Submit Review</button>
                <button class="rides-route-details-cancel-review" style="padding: 0.75rem 1.5rem; background: rgba(255, 255, 255, 0.1); color: var(--text-primary); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; font-weight: 500; cursor: pointer;">Cancel</button>
            </div>
        `;
        
        // Insert form before reviews
        reviewsSection.insertBefore(reviewForm, reviewsSection.firstChild);
        
        // Handle rating stars
        const stars = reviewForm.querySelectorAll('.rides-route-details-rating-input span');
        let selectedRating = 0;
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                selectedRating = index + 1;
                stars.forEach((s, i) => {
                    s.textContent = i < selectedRating ? '★' : '☆';
                });
            });
            
            star.addEventListener('mouseenter', function() {
                stars.forEach((s, i) => {
                    s.textContent = i <= index ? '★' : '☆';
                });
            });
        });
        
        reviewForm.querySelector('.rides-route-details-rating-input').addEventListener('mouseleave', function() {
            stars.forEach((s, i) => {
                s.textContent = i < selectedRating ? '★' : '☆';
            });
        });
        
        // Handle submit
        reviewForm.querySelector('.rides-route-details-submit-review').addEventListener('click', function() {
            const reviewText = reviewForm.querySelector('textarea').value;
            if (selectedRating > 0 && reviewText.trim()) {
                ridesRouteDetailsSubmitReview(selectedRating, reviewText);
                reviewForm.remove();
            }
        });
        
        // Handle cancel
        reviewForm.querySelector('.rides-route-details-cancel-review').addEventListener('click', function() {
            reviewForm.remove();
        });
        
        // Hide add review button
        const addBtn = document.querySelector('.rides-route-details-add-review');
        if (addBtn) {
            addBtn.style.display = 'none';
        }
    }
}

function ridesRouteDetailsSubmitReview(rating, text) {
    console.log('Submitting review:', { rating, text });
    // In a real implementation, this would make an API call
    
    ridesRouteDetailsShowNotification('Review submitted successfully');
    
    // Show add review button again
    const addBtn = document.querySelector('.rides-route-details-add-review');
    if (addBtn) {
        addBtn.style.display = 'block';
    }
}

// Action Buttons
function ridesRouteDetailsInitActions() {
    // Ride This Route button
    const rideButton = document.querySelector('.rides-route-details-button-primary');
    if (rideButton) {
        rideButton.addEventListener('click', function() {
            ridesRouteDetailsStartRide();
        });
    }
    
    // Export GPX button
    const exportButton = document.querySelector('.rides-route-details-button-secondary');
    if (exportButton) {
        exportButton.addEventListener('click', function() {
            ridesRouteDetailsExportGPX();
        });
    }
}

function ridesRouteDetailsStartRide() {
    console.log('Starting ride with this route');
    // In a real implementation, this would:
    // 1. Load the route into the ride tracker
    // 2. Navigate to the ride tracking page
    // 3. Start GPS tracking
    
    ridesRouteDetailsShowNotification('Loading route into ride tracker...');
}

function ridesRouteDetailsExportGPX() {
    console.log('Exporting route as GPX');
    // In a real implementation, this would download the GPX file
    
    ridesRouteDetailsShowNotification('Downloading route GPX file...');
}

// Notifications
function ridesRouteDetailsShowNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        padding: 1rem 1.5rem;
        color: var(--text-primary);
        font-size: 0.875rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        notification.style.animationFillMode = 'forwards';
        
        const slideOutStyle = document.createElement('style');
        slideOutStyle.textContent = `
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(slideOutStyle);
        
        setTimeout(() => {
            notification.remove();
            style.remove();
            slideOutStyle.remove();
        }, 300);
    }, 3000);
}