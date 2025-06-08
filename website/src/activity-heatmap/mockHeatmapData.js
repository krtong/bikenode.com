// Mock data for activity heatmap - NOT REAL DATA
export const mockActivityPoints = [
    // San Francisco area
    { lat: 37.7749, lng: -122.4194, intensity: 0.8 },
    { lat: 37.7751, lng: -122.4186, intensity: 0.9 },
    { lat: 37.7745, lng: -122.4201, intensity: 0.7 },
    { lat: 37.7755, lng: -122.4178, intensity: 0.85 },
    { lat: 37.7742, lng: -122.4209, intensity: 0.6 },
    // Golden Gate Park area
    { lat: 37.7694, lng: -122.4862, intensity: 0.95 },
    { lat: 37.7699, lng: -122.4855, intensity: 0.9 },
    { lat: 37.7689, lng: -122.4869, intensity: 0.88 },
    { lat: 37.7702, lng: -122.4848, intensity: 0.92 },
    // Embarcadero
    { lat: 37.7993, lng: -122.3977, intensity: 0.75 },
    { lat: 37.7989, lng: -122.3982, intensity: 0.8 },
    { lat: 37.7997, lng: -122.3972, intensity: 0.7 },
    // Berkeley Hills
    { lat: 37.8716, lng: -122.2727, intensity: 0.65 },
    { lat: 37.8720, lng: -122.2722, intensity: 0.7 },
    { lat: 37.8712, lng: -122.2732, intensity: 0.6 }
];

export const mockActivityTracks = [
    {
        id: 'track-001',
        userId: 'user-001',
        activityId: 'activity-001',
        timestamp: new Date('2024-06-06T08:30:00'),
        activityType: 'road',
        path: [
            [-122.4194, 37.7749],
            [-122.4186, 37.7751],
            [-122.4178, 37.7755],
            [-122.4169, 37.7758],
            [-122.4161, 37.7762]
        ]
    },
    {
        id: 'track-002',
        userId: 'user-002',
        activityId: 'activity-002',
        timestamp: new Date('2024-06-06T09:15:00'),
        activityType: 'mountain',
        path: [
            [-122.2727, 37.8716],
            [-122.2722, 37.8720],
            [-122.2718, 37.8724],
            [-122.2714, 37.8728],
            [-122.2710, 37.8732]
        ]
    }
];

export const mockHeatmapStats = {
    totalActivities: 12847,
    uniqueRiders: 3421,
    totalMiles: 256000,
    lastUpdated: new Date(),
    popularTimes: {
        weekday: { morning: 0.3, afternoon: 0.2, evening: 0.5 },
        weekend: { morning: 0.6, afternoon: 0.3, evening: 0.1 }
    }
};

// Generate more mock points for a realistic heatmap
export function generateMockHeatmapData(centerLat, centerLng, radius = 0.1, count = 100) {
    const points = [];
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.random() * radius;
        const lat = centerLat + r * Math.cos(angle);
        const lng = centerLng + r * Math.sin(angle);
        const intensity = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
        
        points.push({ lat, lng, intensity });
    }
    
    return points;
}

// Get mock activity data for a specific area
export function getMockActivityData(bounds) {
    // In a real app, this would filter based on bounds
    // For mock, return all points
    return {
        points: mockActivityPoints,
        tracks: mockActivityTracks,
        stats: mockHeatmapStats
    };
}