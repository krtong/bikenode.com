// Mock data for routes - NOT REAL DATA
export const mockRoutesData = [
    {
        id: 'route-001',
        userId: 'user-001',
        name: 'Golden Gate Loop',
        description: 'Classic San Francisco ride over the Golden Gate Bridge to Sausalito and back',
        distance: 32.5,
        elevation: 425,
        duration: 7200,
        difficulty: 'moderate',
        surface: { paved: 95, gravel: 5, dirt: 0 },
        waypoints: [
            { position: 0, lat: 37.7749, lng: -122.4194, name: 'Start - Embarcadero' },
            { position: 1, lat: 37.8083, lng: -122.4757, name: 'Golden Gate Bridge' },
            { position: 2, lat: 37.8594, lng: -122.4785, name: 'Sausalito' },
            { position: 3, lat: 37.7749, lng: -122.4194, name: 'End - Embarcadero' }
        ],
        tags: ['scenic', 'tourist-friendly', 'moderate-traffic'],
        saves: 234,
        completions: 89,
        rating: 4.7,
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-05-20')
    },
    {
        id: 'route-002',
        userId: 'user-002',
        name: 'Berkeley Hills Challenge',
        description: 'Challenging climb through Berkeley Hills with stunning Bay Area views',
        distance: 45.2,
        elevation: 1250,
        duration: 10800,
        difficulty: 'hard',
        surface: { paved: 100, gravel: 0, dirt: 0 },
        waypoints: [
            { position: 0, lat: 37.8716, lng: -122.2727, name: 'Berkeley Marina' },
            { position: 1, lat: 37.8781, lng: -122.2389, name: 'Grizzly Peak' },
            { position: 2, lat: 37.8599, lng: -122.2502, name: 'Tilden Park' },
            { position: 3, lat: 37.8716, lng: -122.2727, name: 'Berkeley Marina' }
        ],
        tags: ['climbing', 'challenging', 'scenic-views'],
        saves: 156,
        completions: 42,
        rating: 4.5,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-06-01')
    },
    {
        id: 'route-003',
        userId: 'user-003',
        name: 'Coastal Cruiser',
        description: 'Easy coastal ride perfect for beginners and families',
        distance: 18.7,
        elevation: 120,
        duration: 4800,
        difficulty: 'easy',
        surface: { paved: 100, gravel: 0, dirt: 0 },
        waypoints: [
            { position: 0, lat: 37.7594, lng: -122.5107, name: 'Ocean Beach' },
            { position: 1, lat: 37.7083, lng: -122.5033, name: 'Fort Funston' },
            { position: 2, lat: 37.7594, lng: -122.5107, name: 'Ocean Beach' }
        ],
        tags: ['family-friendly', 'flat', 'ocean-views'],
        saves: 389,
        completions: 267,
        rating: 4.8,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-05-15')
    }
];

// Mock route creation
export function createMockRoute(routeData) {
    const newRoute = {
        id: `route-${Date.now()}`,
        userId: 'current-user',
        saves: 0,
        completions: 0,
        rating: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...routeData
    };
    
    mockRoutesData.push(newRoute);
    return newRoute;
}

// Mock route search
export function searchMockRoutes(query, filters = {}) {
    let results = [...mockRoutesData];
    
    // Text search
    if (query) {
        const searchTerm = query.toLowerCase();
        results = results.filter(route => 
            route.name.toLowerCase().includes(searchTerm) ||
            route.description.toLowerCase().includes(searchTerm) ||
            route.tags.some(tag => tag.includes(searchTerm))
        );
    }
    
    // Filter by difficulty
    if (filters.difficulty) {
        results = results.filter(route => route.difficulty === filters.difficulty);
    }
    
    // Filter by distance range
    if (filters.minDistance !== undefined) {
        results = results.filter(route => route.distance >= filters.minDistance);
    }
    if (filters.maxDistance !== undefined) {
        results = results.filter(route => route.distance <= filters.maxDistance);
    }
    
    // Sort
    if (filters.sortBy) {
        switch (filters.sortBy) {
            case 'distance':
                results.sort((a, b) => a.distance - b.distance);
                break;
            case 'elevation':
                results.sort((a, b) => a.elevation - b.elevation);
                break;
            case 'rating':
                results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'saves':
                results.sort((a, b) => b.saves - a.saves);
                break;
            case 'newest':
                results.sort((a, b) => b.createdAt - a.createdAt);
                break;
        }
    }
    
    return results;
}

// Mock user routes
export function getMockUserRoutes(userId) {
    return mockRoutesData.filter(route => route.userId === userId);
}

// Mock route by ID
export function getMockRouteById(routeId) {
    return mockRoutesData.find(route => route.id === routeId);
}