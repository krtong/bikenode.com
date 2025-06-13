// Rides My Dashboard JavaScript

// Sample ride data (replace with API calls)
const sampleRides = [
  {
    id: 1,
    title: "Morning Century",
    date: new Date(),
    distance: 102.3,
    duration: "5:23:45",
    elevation: 4521,
    avgSpeed: 19.0,
    type: "road"
  },
  {
    id: 2,
    title: "Trail Session",
    date: new Date(Date.now() - 86400000),
    distance: 18.7,
    duration: "2:15:30",
    elevation: 2134,
    avgSpeed: 8.3,
    type: "mountain"
  },
  {
    id: 3,
    title: "Commute",
    date: new Date(Date.now() - 172800000),
    distance: 12.4,
    duration: "0:45:12",
    elevation: 234,
    avgSpeed: 16.5,
    type: "urban"
  },
  {
    id: 4,
    title: "Group Ride",
    date: new Date(Date.now() - 259200000),
    distance: 45.8,
    duration: "2:34:18",
    elevation: 1876,
    avgSpeed: 17.8,
    type: "road"
  },
  {
    id: 5,
    title: "Recovery Spin",
    date: new Date(Date.now() - 345600000),
    distance: 22.1,
    duration: "1:30:00",
    elevation: 543,
    avgSpeed: 14.7,
    type: "road"
  }
];

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
  initializeActivityChart();
  loadRecentRides();
  setupEventListeners();
});

// Initialize the activity chart
function initializeActivityChart() {
  const ctx = document.getElementById('rides-my-dashboard-activity-chart').getContext('2d');
  
  // Generate sample data for the last 7 days
  const labels = [];
  const distanceData = [];
  const elevationData = [];
  const timeData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    
    // Generate random data (replace with real data)
    distanceData.push(Math.random() * 50 + 10);
    elevationData.push(Math.random() * 2000 + 500);
    timeData.push(Math.random() * 3 + 0.5);
  }
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Distance (mi)',
          data: distanceData,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Elevation (ft)',
          data: elevationData.map(e => e / 100), // Scale down for display
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1'
        },
        {
          label: 'Time (hrs)',
          data: timeData,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 14,
            weight: '600'
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            afterLabel: function(context) {
              if (context.dataset.label === 'Elevation (ft)') {
                return `${(context.raw * 100).toFixed(0)} ft`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#9CA3AF'
          }
        },
        y: {
          position: 'left',
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            color: '#9CA3AF'
          }
        },
        y1: {
          position: 'right',
          display: false,
          grid: {
            drawOnChartArea: false
          }
        },
        y2: {
          position: 'right',
          display: false,
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
  
  // Store chart instance for range updates
  window.activityChart = chart;
}

// Load recent rides
function loadRecentRides() {
  const ridesContainer = document.getElementById('rides-my-dashboard-recent-rides');
  
  const ridesHTML = sampleRides.map(ride => {
    const icon = getActivityIcon(ride.type);
    const dateStr = formatDate(ride.date);
    
    return `
      <div class="ride-item" data-ride-id="${ride.id}">
        <div class="ride-icon">${icon}</div>
        <div class="ride-details">
          <div class="ride-title">${ride.title}</div>
          <div class="ride-subtitle">${dateStr}</div>
          <div class="ride-stats">
            <span class="ride-stat"><strong>${ride.distance.toFixed(1)}</strong> mi</span>
            <span class="ride-stat"><strong>${ride.duration}</strong></span>
            <span class="ride-stat"><strong>${ride.elevation.toLocaleString()}</strong> ft</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  ridesContainer.innerHTML = ridesHTML;
}

// Setup event listeners
function setupEventListeners() {
  // Chart range controls
  document.querySelectorAll('.chart-controls .control-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const range = e.target.dataset.range;
      updateChartRange(range);
      
      // Update active state
      document.querySelectorAll('.chart-controls .control-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });
  
  // Ride item clicks
  document.addEventListener('click', (e) => {
    const rideItem = e.target.closest('.ride-item');
    if (rideItem) {
      const rideId = rideItem.dataset.rideId;
      window.location.href = `/ride-details/?id=${rideId}`;
    }
  });
  
  // Edit goals button
  document.querySelector('.edit-goals-btn')?.addEventListener('click', () => {
    // Open goals modal or navigate to goals page
    alert('Edit goals functionality coming soon!');
  });
}

// Update chart range
function updateChartRange(range) {
  // This would fetch new data based on the range
  // For now, just regenerate random data
  const labels = [];
  const distanceData = [];
  const elevationData = [];
  const timeData = [];
  
  let days = 7;
  if (range === 'month') days = 30;
  if (range === 'year') days = 365;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    if (range === 'week') {
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    } else if (range === 'month') {
      if (i % 5 === 0) {
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      } else {
        labels.push('');
      }
    } else {
      if (i % 30 === 0) {
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      } else {
        labels.push('');
      }
    }
    
    distanceData.push(Math.random() * 50 + 10);
    elevationData.push(Math.random() * 2000 + 500);
    timeData.push(Math.random() * 3 + 0.5);
  }
  
  window.activityChart.data.labels = labels;
  window.activityChart.data.datasets[0].data = distanceData;
  window.activityChart.data.datasets[1].data = elevationData.map(e => e / 100);
  window.activityChart.data.datasets[2].data = timeData;
  window.activityChart.update();
}

// Helper functions
function getActivityIcon(type) {
  const icons = {
    road: '🚴',
    mountain: '⛰️',
    urban: '🏙️',
    gravel: '🌲',
    indoor: '🏠'
  };
  return icons[type] || '🚴';
}

function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else if (days === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Export functions for use in other modules
export { loadRecentRides, updateChartRange };