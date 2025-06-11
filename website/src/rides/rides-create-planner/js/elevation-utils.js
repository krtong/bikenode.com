// Elevation utilities for Route Planner

export function updateElevationProfile(routePlanner) {
    if (!routePlanner.elevationData || routePlanner.elevationData.length === 0) {
        console.log('No elevation data to display');
        return;
    }
    
    const profileContainer = document.getElementById('elevationProfile');
    if (!profileContainer) {
        console.error('Elevation profile container not found');
        return;
    }
    
    // Show the elevation profile section
    profileContainer.style.display = 'block';
    
    // Create or update the elevation chart
    if (!routePlanner.elevationChart) {
        createElevationChart(routePlanner, profileContainer);
    } else {
        updateElevationChart(routePlanner);
    }
}

function createElevationChart(routePlanner, container) {
    // For now, create a simple elevation profile
    // In production, you'd use a charting library like Chart.js
    
    let chartHTML = `
        <div class="elevation-chart-container">
            <canvas id="elevationChart" width="300" height="150"></canvas>
        </div>
    `;
    
    container.innerHTML = chartHTML;
    
    const canvas = document.getElementById('elevationChart');
    const ctx = canvas.getContext('2d');
    
    // Draw simple elevation profile
    drawElevationProfile(ctx, routePlanner.elevationData);
    
    routePlanner.elevationChart = canvas;
}

function updateElevationChart(routePlanner) {
    const canvas = routePlanner.elevationChart;
    const ctx = canvas.getContext('2d');
    
    // Clear and redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawElevationProfile(ctx, routePlanner.elevationData);
}

function drawElevationProfile(ctx, elevationData) {
    if (!elevationData || elevationData.length === 0) return;
    
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const padding = 20;
    
    // Find min/max elevation
    let minElev = Infinity;
    let maxElev = -Infinity;
    
    elevationData.forEach(point => {
        minElev = Math.min(minElev, point.elevation);
        maxElev = Math.max(maxElev, point.elevation);
    });
    
    // Add some padding to elevation range
    const elevRange = maxElev - minElev;
    minElev -= elevRange * 0.1;
    maxElev += elevRange * 0.1;
    
    // Draw grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding + (height - 2 * padding) * i / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw elevation profile
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    elevationData.forEach((point, index) => {
        const x = padding + (width - 2 * padding) * index / (elevationData.length - 1);
        const y = height - padding - (point.elevation - minElev) / (maxElev - minElev) * (height - 2 * padding);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Fill area under curve
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = 'rgba(79, 70, 229, 0.1)';
    ctx.fill();
    
    // Draw elevation labels
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
        const elev = minElev + (maxElev - minElev) * (1 - i / 4);
        const y = padding + (height - 2 * padding) * i / 4;
        ctx.fillText(`${Math.round(elev * 3.28084)}ft`, padding - 5, y + 3);
    }
}

// Add CSS for elevation profile
const style = document.createElement('style');
style.textContent = `
    .elevation-chart-container {
        width: 100%;
        height: 150px;
        background: var(--background-secondary);
        border-radius: 8px;
        padding: 10px;
        margin-top: 10px;
    }
    
    #elevationChart {
        width: 100%;
        height: 100%;
    }
`;
document.head.appendChild(style);