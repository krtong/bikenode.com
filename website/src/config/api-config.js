// API Configuration
// This file centralizes all API endpoints to avoid hardcoded URLs throughout the codebase
// Environment variables can be set in deployment or .env files

// Helper function to get environment variable with fallback
function getEnvVar(key, fallback) {
    // In browser environment, these would typically be injected during build
    // For 11ty, we can use process.env during build time
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    // Check if defined on window object (for runtime configuration)
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
        return window.ENV[key];
    }
    return fallback;
}

export const API_CONFIG = {
    // Main API endpoints
    MAIN_API: getEnvVar('MAIN_API_URL', 'http://localhost:8080/api'),
    USER_API: getEnvVar('USER_API_URL', 'http://localhost:8081/api'),
    
    // Routing service endpoints
    VALHALLA_API: getEnvVar('VALHALLA_API_URL', 'http://localhost:8002'),
    BROUTER_API: getEnvVar('BROUTER_API_URL', 'http://localhost:17777'),
    
    // External APIs (typically don't need environment configuration)
    OSRM_API: 'https://router.project-osrm.org/route/v1',
    GRAPHHOPPER_API: 'https://graphhopper.com/api/1/route',
    NOMINATIM_API: 'https://nominatim.openstreetmap.org/search',
    OVERPASS_APIS: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter'
    ]
};

// Export individual configs for convenience
export const MAIN_API = API_CONFIG.MAIN_API;
export const USER_API = API_CONFIG.USER_API;

// Function to update config at runtime (useful for testing or dynamic configuration)
export function updateAPIConfig(updates) {
    Object.assign(API_CONFIG, updates);
}

// Function to get full API URL
export function getAPIUrl(base, endpoint) {
    return `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}