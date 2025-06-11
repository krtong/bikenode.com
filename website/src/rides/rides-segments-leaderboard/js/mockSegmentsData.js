// Mock data for segments - NOT REAL DATA
export const mockSegmentsData = [
    {
        id: 'seg-001',
        name: 'Hilltop Sprint',
        location: 'San Francisco, CA',
        distance: 1.2,
        elevation: 89,
        avgGrade: 7.4,
        maxGrade: 12.8,
        category: 'cat4',
        bounds: {
            minLat: 37.7749,
            maxLat: 37.7849,
            minLng: -122.4194,
            maxLng: -122.4094
        },
        stats: {
            totalAttempts: 3421,
            uniqueRiders: 892,
            popularityScore: 85,
            recordTime: 245,
            recordHolder: 'Alex Chen',
            recordDate: new Date('2024-03-15'),
            averageTime: 312
        },
        leaderboard: [
            { rank: 1, userName: 'Alex Chen', time: 245, speed: 17.6, date: new Date('2024-03-15'), isKOM: true },
            { rank: 2, userName: 'Maria Rodriguez', time: 248, speed: 17.4, date: new Date('2024-03-10') },
            { rank: 3, userName: 'John Smith', time: 251, speed: 17.2, date: new Date('2024-02-28') }
        ],
        elevationProfile: [0, 12, 25, 45, 68, 82, 89, 85, 78, 65, 45, 20, 0]
    },
    {
        id: 'seg-002',
        name: 'Coastal Cruise',
        location: 'Santa Monica, CA',
        distance: 5.8,
        elevation: 32,
        avgGrade: 0.6,
        maxGrade: 2.1,
        category: 'flat',
        bounds: {
            minLat: 34.0194,
            maxLat: 34.0294,
            minLng: -118.4912,
            maxLng: -118.4812
        },
        stats: {
            totalAttempts: 8923,
            uniqueRiders: 2341,
            popularityScore: 92,
            recordTime: 723,
            recordHolder: 'Emma Wilson',
            recordDate: new Date('2024-04-02'),
            averageTime: 845
        },
        leaderboard: [
            { rank: 1, userName: 'Emma Wilson', time: 723, speed: 28.8, date: new Date('2024-04-02'), isKOM: true },
            { rank: 2, userName: 'David Lee', time: 731, speed: 28.5, date: new Date('2024-03-28') },
            { rank: 3, userName: 'Sarah Johnson', time: 738, speed: 28.2, date: new Date('2024-03-20') }
        ],
        elevationProfile: [0, 5, 8, 12, 15, 18, 22, 25, 28, 30, 32, 30, 28, 25, 20, 15, 10, 5, 0]
    },
    {
        id: 'seg-003',
        name: 'Mountain Pass Challenge',
        location: 'Boulder, CO',
        distance: 8.3,
        elevation: 421,
        avgGrade: 5.1,
        maxGrade: 9.8,
        category: 'cat2',
        bounds: {
            minLat: 40.0150,
            maxLat: 40.0350,
            minLng: -105.2705,
            maxLng: -105.2505
        },
        stats: {
            totalAttempts: 1256,
            uniqueRiders: 423,
            popularityScore: 78,
            recordTime: 1823,
            recordHolder: 'Mike Thompson',
            recordDate: new Date('2024-05-10'),
            averageTime: 2156
        },
        leaderboard: [
            { rank: 1, userName: 'Mike Thompson', time: 1823, speed: 16.4, date: new Date('2024-05-10'), isKOM: true },
            { rank: 2, userName: 'Lisa Park', time: 1856, speed: 16.1, date: new Date('2024-05-05') },
            { rank: 3, userName: 'Chris Davis', time: 1892, speed: 15.8, date: new Date('2024-04-22') }
        ],
        elevationProfile: [0, 45, 89, 134, 178, 223, 267, 312, 356, 401, 421, 415, 398, 367, 312, 256, 189, 123, 67, 23, 0]
    }
];

// Mock nearby segments based on location
export function getMockNearbySegments(lat, lng, radius = 10) {
    // In a real app, this would filter based on actual distance
    // For mock, just return all segments
    return mockSegmentsData;
}

// Mock user segments
export function getMockUserSegments(userId) {
    // Return segments with user's attempts
    return mockSegmentsData.map(segment => ({
        ...segment,
        personalBest: Math.floor(segment.stats.averageTime * (0.9 + Math.random() * 0.2)),
        lastAttemptTime: Math.floor(segment.stats.averageTime * (0.95 + Math.random() * 0.15)),
        lastAttemptDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        attemptCount: Math.floor(Math.random() * 20) + 1
    }));
}

// Mock segment creation
export function createMockSegment(segmentData) {
    const newSegment = {
        id: `seg-${Date.now()}`,
        ...segmentData,
        stats: {
            totalAttempts: 0,
            uniqueRiders: 0,
            popularityScore: 0,
            recordTime: null,
            recordHolder: null,
            recordDate: null,
            averageTime: null
        },
        leaderboard: [],
        createdAt: new Date()
    };
    
    mockSegmentsData.push(newSegment);
    return newSegment;
}

// Mock segment attempt recording
export function recordMockAttempt(segmentId, attemptData) {
    const segment = mockSegmentsData.find(s => s.id === segmentId);
    if (!segment) return null;
    
    // Update segment stats
    segment.stats.totalAttempts++;
    
    // Check if it's a new record
    if (!segment.stats.recordTime || attemptData.time < segment.stats.recordTime) {
        segment.stats.recordTime = attemptData.time;
        segment.stats.recordHolder = attemptData.userName;
        segment.stats.recordDate = new Date();
    }
    
    return {
        id: `attempt-${Date.now()}`,
        segmentId,
        ...attemptData,
        isPersonalBest: true, // Simplified for mock
        isKOM: attemptData.time === segment.stats.recordTime
    };
}