/**
 * Crash reports management
 */

export async function loadCrashReports(apiBase) {
    try {
        const response = await fetch(`${apiBase}/user/crash-reports`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load crash reports');
    } catch (error) {
        console.error('Error loading crash reports:', error);
        return [];
    }
}

export function renderCrashReport(report) {
    const severityClass = getSeverityClass(report.severity);
    const reportDate = new Date(report.date).toLocaleDateString();
    
    return `
        <div class="card mb-3 crash-report-card">
            <div class="report-header">
                <div>
                    <h3 class="font-lg font-semibold mb-1">${report.title}</h3>
                    <p class="text-secondary font-sm">${reportDate} • ${report.location}</p>
                </div>
                <span class="report-severity ${severityClass}">${report.severity}</span>
            </div>
            
            <div class="report-details">
                <div class="detail-item">
                    <span class="text-secondary font-sm">Speed</span>
                    <span class="font-medium">${report.speed} mph</span>
                </div>
                <div class="detail-item">
                    <span class="text-secondary font-sm">Conditions</span>
                    <span class="font-medium">${report.conditions}</span>
                </div>
                <div class="detail-item">
                    <span class="text-secondary font-sm">Bike</span>
                    <span class="font-medium">${report.bikeName}</span>
                </div>
            </div>
            
            <p class="text-secondary mb-3">${report.description}</p>
            
            <div class="gear-ratings">
                ${report.gearRatings.map(gear => renderGearRating(gear)).join('')}
            </div>
        </div>
    `;
}

function renderGearRating(gear) {
    const stars = '⭐'.repeat(gear.rating);
    return `
        <div class="gear-rating">
            <span class="font-medium">${gear.name}</span>
            <span class="rating-stars">${stars}</span>
        </div>
    `;
}

function getSeverityClass(severity) {
    const classes = {
        'Minor': 'minor',
        'Moderate': 'moderate',
        'Serious': 'serious',
        'Severe': 'severe'
    };
    return classes[severity] || 'minor';
}

// Modal functions
window.openAddCrashReportModal = function() {
    // Implementation for opening crash report modal
    console.log('Opening crash report modal...');
};