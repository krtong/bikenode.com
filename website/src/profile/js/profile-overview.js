// Profile Overview Tab JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Initialize overview features when tab is active
    const overviewTab = document.getElementById('overview-tab');
    if (overviewTab && overviewTab.classList.contains('active')) {
        initializeOverviewFeatures();
    }

    // Also initialize when overview tab is clicked
    const overviewTabBtn = document.querySelector('[data-tab="overview"]');
    if (overviewTabBtn) {
        overviewTabBtn.addEventListener('click', () => {
            setTimeout(() => {
                initializeOverviewFeatures();
            }, 100);
        });
    }
});

function initializeOverviewFeatures() {
    // Initialize activity chart
    initializeActivityChart();
    
    // Setup time filter interactions
    setupTimeFilter();
    
    // Animate metrics on first view
    animateMetrics();
    
    // Setup streak calendar interactions
    setupStreakCalendar();
    
    // Initialize timeline interactions
    setupTimelineInteractions();
}

// Enhanced Activity Chart
function initializeActivityChart() {
    const canvas = document.getElementById('activityChart');
    if (!canvas || !canvas.getContext) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2; // Higher resolution
    const height = canvas.height = 240; // Taller chart
    
    // Set canvas display size
    canvas.style.width = canvas.offsetWidth + 'px';
    canvas.style.height = '120px';
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Sample data for the last 30 days
    const data = generateSampleActivityData(30);
    
    // Calculate chart dimensions
    const padding = 40;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    const barWidth = chartWidth / data.length;
    
    // Find max value for scaling
    const maxValue = Math.max(...data.map(d => d.value));
    
    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, 'rgba(88, 101, 242, 0.2)');
    gradient.addColorStop(1, 'rgba(88, 101, 242, 0.8)');
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw bars with animation
    data.forEach((day, index) => {
        setTimeout(() => {
            const barHeight = (day.value / maxValue) * chartHeight;
            const x = padding + (index * barWidth) + (barWidth * 0.15);
            const y = height - padding - barHeight;
            const barActualWidth = barWidth * 0.7;
            
            // Bar shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(x + 2, y + 2, barActualWidth, barHeight);
            
            // Bar gradient
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barActualWidth, barHeight);
            
            // Highlight today's bar
            if (index === data.length - 1) {
                ctx.strokeStyle = 'rgba(88, 101, 242, 0.8)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, barActualWidth, barHeight);
            }
        }, index * 20); // Staggered animation
    });
    
    // Draw axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '20px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('30d ago', padding, height - 10);
    ctx.textAlign = 'right';
    ctx.fillText('Today', width - padding, height - 10);
    
    // Add value labels on Y-axis
    ctx.textAlign = 'right';
    ctx.fillText(maxValue + ' mi', padding - 10, padding);
    ctx.fillText('0 mi', padding - 10, height - padding);
}

// Time filter functionality
function setupTimeFilter() {
    const timeFilter = document.querySelector('.time-filter');
    if (!timeFilter) return;
    
    timeFilter.addEventListener('change', (e) => {
        const period = e.target.value;
        updateRidingSnapshot(period);
        
        // Add loading animation
        const snapshotGrid = document.querySelector('.snapshot-grid');
        if (snapshotGrid) {
            snapshotGrid.style.opacity = '0.5';
            setTimeout(() => {
                snapshotGrid.style.opacity = '1';
                animateMetrics();
            }, 300);
        }
    });
}

function updateRidingSnapshot(period) {
    // Update metrics based on period
    const metrics = getMetricsForPeriod(period);
    
    // Update metric values
    document.querySelectorAll('.snapshot-metric').forEach((metric, index) => {
        const valueEl = metric.querySelector('.metric-value');
        const trendEl = metric.querySelector('.metric-trend');
        
        if (valueEl && metrics[index]) {
            // Animate number change
            animateValue(valueEl, parseFloat(valueEl.textContent), metrics[index].value, 500);
            
            // Update trend
            if (trendEl) {
                trendEl.className = `metric-trend ${metrics[index].trend}`;
                trendEl.lastChild.textContent = metrics[index].trendValue;
            }
        }
    });
    
    // Regenerate chart
    initializeActivityChart();
}

// Get metrics data for different time periods
function getMetricsForPeriod(period) {
    const metricsData = {
        week: [
            { value: 3, trend: 'down', trendValue: '-25%' },
            { value: 145, trend: 'down', trendValue: '-30%' },
            { value: 25.2, trend: 'up', trendValue: '+5%' },
            { value: 12000, trend: 'neutral', trendValue: '0%' }
        ],
        month: [
            { value: 12, trend: 'up', trendValue: '+20%' },
            { value: 856, trend: 'up', trendValue: '+15%' },
            { value: 28.5, trend: 'neutral', trendValue: '0%' },
            { value: 45000, trend: 'down', trendValue: '-5%' }
        ],
        year: [
            { value: 89, trend: 'up', trendValue: '+35%' },
            { value: 4234, trend: 'up', trendValue: '+42%' },
            { value: 26.8, trend: 'up', trendValue: '+8%' },
            { value: 156000, trend: 'up', trendValue: '+28%' }
        ],
        all: [
            { value: 342, trend: 'up', trendValue: '+100%' },
            { value: 12345, trend: 'up', trendValue: '+100%' },
            { value: 27.2, trend: 'up', trendValue: '+12%' },
            { value: 456000, trend: 'up', trendValue: '+100%' }
        ]
    };
    
    return metricsData[period] || metricsData.month;
}

// Animate metric values
function animateMetrics() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach((metric, index) => {
        const value = parseFloat(metric.textContent);
        metric.style.opacity = '0';
        metric.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            metric.style.transition = 'all 0.6s ease';
            metric.style.opacity = '1';
            metric.style.transform = 'translateY(0)';
            
            // Animate the number
            animateValue(metric, 0, value, 1000);
        }, index * 100);
    });
}

// Animate number counting
function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();
    const isDecimal = end % 1 !== 0;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = start + (range * easeProgress);
        
        if (isDecimal) {
            element.textContent = current.toFixed(1);
        } else if (end > 1000) {
            element.textContent = (current / 1000).toFixed(1) + 'K';
        } else {
            element.textContent = Math.floor(current);
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Streak calendar interactions
function setupStreakCalendar() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    calendarDays.forEach((day, index) => {
        // Add hover effect
        day.addEventListener('mouseenter', () => {
            if (day.classList.contains('active')) {
                day.style.transform = 'scale(1.15)';
            }
        });
        
        day.addEventListener('mouseleave', () => {
            day.style.transform = 'scale(1.05)';
        });
        
        // Add click to toggle (for demo)
        day.addEventListener('click', () => {
            day.classList.toggle('active');
            updateStreakCount();
        });
    });
}

// Update streak count
function updateStreakCount() {
    const activeDays = document.querySelectorAll('.calendar-day.active').length;
    const streakNumber = document.querySelector('.streak-number');
    if (streakNumber) {
        animateValue(streakNumber, parseInt(streakNumber.textContent), activeDays, 300);
    }
}

// Timeline interactions
function setupTimelineInteractions() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    timelineItems.forEach((item, index) => {
        // Animate on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '0';
                        entry.target.style.transform = 'translateX(-20px)';
                        
                        setTimeout(() => {
                            entry.target.style.transition = 'all 0.6s ease';
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateX(0)';
                        }, 50);
                    }, index * 100);
                    
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(item);
        
        // Add click interaction
        item.addEventListener('click', () => {
            // Navigate to relevant section based on activity type
            const markerIcon = item.querySelector('.marker-icon');
            if (markerIcon) {
                if (markerIcon.classList.contains('ride')) {
                    window.location.href = '/rides-dashboard/';
                } else if (markerIcon.classList.contains('garage')) {
                    document.querySelector('[data-tab="garage"]')?.click();
                } else if (markerIcon.classList.contains('achievement')) {
                    document.querySelector('[data-tab="achievements"]')?.click();
                } else if (markerIcon.classList.contains('post')) {
                    document.querySelector('[data-tab="posts"]')?.click();
                } else if (markerIcon.classList.contains('community')) {
                    document.querySelector('[data-tab="communities"]')?.click();
                }
            }
        });
    });
}

// Generate sample activity data
function generateSampleActivityData(days) {
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Generate more realistic activity patterns
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        let value = 0;
        if (Math.random() > (isWeekend ? 0.2 : 0.5)) {
            // Weekend rides tend to be longer
            if (isWeekend) {
                value = Math.floor(Math.random() * 80) + 40; // 40-120 miles
            } else {
                value = Math.floor(Math.random() * 40) + 10; // 10-50 miles
            }
        }
        
        data.push({
            date: date,
            value: value,
            dayOfWeek: dayOfWeek
        });
    }
    
    return data;
}

// Achievement hover effects
document.addEventListener('DOMContentLoaded', () => {
    const achievementItems = document.querySelectorAll('.achievement-item');
    achievementItems.forEach(item => {
        item.addEventListener('click', () => {
            // Navigate to achievements tab
            document.querySelector('[data-tab="achievements"]')?.click();
        });
    });
    
    // Event items click handler
    const eventItems = document.querySelectorAll('.event-item');
    eventItems.forEach(item => {
        item.addEventListener('click', () => {
            // In a real app, this would open event details
            console.log('Event clicked:', item.querySelector('.event-name').textContent);
        });
    });
    
    // Community items are already links, but add visual feedback
    const communityItems = document.querySelectorAll('.community-item');
    communityItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const communityName = item.querySelector('.community-name').textContent;
            // Navigate to community page
            window.location.href = item.getAttribute('href');
        });
    });
});

// Export functions for use in other scripts
window.profileOverview = {
    initializeOverviewFeatures,
    updateRidingSnapshot,
    animateMetrics
};