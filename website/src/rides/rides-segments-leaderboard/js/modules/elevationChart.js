// Elevation Chart Module
export function drawElevationSparklines() {
    const canvases = document.querySelectorAll('.elevation-sparkline');
    
    canvases.forEach(canvas => {
        const elevations = JSON.parse(canvas.dataset.elevations || '[]');
        drawSparkline(canvas, elevations);
    });
}

function drawSparkline(canvas, elevations) {
    if (!canvas || elevations.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Set canvas size
    canvas.width = width * 2; // Retina display
    canvas.height = height * 2;
    ctx.scale(2, 2);
    
    // Calculate min/max
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const range = maxElev - minElev || 1;
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(88, 101, 242, 0.3)');
    gradient.addColorStop(1, 'rgba(88, 101, 242, 0.05)');
    
    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    elevations.forEach((elev, i) => {
        const x = (i / (elevations.length - 1)) * width;
        const y = height - ((elev - minElev) / range) * height * 0.8 - height * 0.1;
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            // Smooth curve
            const prevX = ((i - 1) / (elevations.length - 1)) * width;
            const prevY = height - ((elevations[i - 1] - minElev) / range) * height * 0.8 - height * 0.1;
            const cpX = (prevX + x) / 2;
            
            ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            ctx.quadraticCurveTo(cpX, (prevY + y) / 2, x, y);
        }
    });
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    elevations.forEach((elev, i) => {
        const x = (i / (elevations.length - 1)) * width;
        const y = height - ((elev - minElev) / range) * height * 0.8 - height * 0.1;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.strokeStyle = 'rgba(88, 101, 242, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Draw detailed elevation chart for modal
export function drawDetailedElevationChart(canvasId, elevationData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Set canvas size
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Mock elevation data if not provided
    if (!elevationData) {
        elevationData = [];
        for (let i = 0; i <= 20; i++) {
            elevationData.push({
                distance: i * 0.105,
                elevation: 52 + Math.sin(i * 0.3) * 50 + i * 30 + Math.random() * 20
            });
        }
    }
    
    // Calculate bounds
    const minElev = Math.min(...elevationData.map(d => d.elevation));
    const maxElev = Math.max(...elevationData.map(d => d.elevation));
    const maxDist = Math.max(...elevationData.map(d => d.distance));
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
        const x = padding + (i / 10) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
    }
    
    // Draw elevation profile
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(88, 101, 242, 0.4)');
    gradient.addColorStop(1, 'rgba(88, 101, 242, 0.1)');
    
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    elevationData.forEach((point, i) => {
        const x = padding + (point.distance / maxDist) * chartWidth;
        const y = height - padding - ((point.elevation - minElev) / (maxElev - minElev)) * chartHeight;
        
        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.lineTo(width - padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.beginPath();
    elevationData.forEach((point, i) => {
        const x = padding + (point.distance / maxDist) * chartWidth;
        const y = height - padding - ((point.elevation - minElev) / (maxElev - minElev)) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.strokeStyle = '#5865f2';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw axes labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    
    // Distance labels
    for (let i = 0; i <= 5; i++) {
        const dist = (maxDist * i / 5).toFixed(1);
        const x = padding + (i / 5) * chartWidth;
        ctx.fillText(dist + ' mi', x, height - 5);
    }
    
    // Elevation labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const elev = Math.round(minElev + (maxElev - minElev) * (1 - i / 5));
        const y = padding + (i / 5) * chartHeight;
        ctx.fillText(elev + ' ft', padding - 5, y + 3);
    }
}

// Initialize detail chart when modal opens
window.addEventListener('viewSegment', () => {
    setTimeout(() => {
        drawDetailedElevationChart('elevationChart');
    }, 200);
});