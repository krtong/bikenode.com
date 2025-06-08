// Routing Engine Event Handlers
import { routingEngineManager } from './routing-engines.js';

export function setupRoutingEngineHandlers(routePlanner) {
    // Engine selection
    const engineRadios = document.querySelectorAll('input[name="routingEngine"]');
    engineRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            const engine = e.target.value;
            const statusIndicator = document.getElementById('engineStatus');
            const statusDot = statusIndicator.querySelector('.status-dot');
            const statusText = statusIndicator.querySelector('.status-text');
            
            // Show loading state
            statusDot.className = 'status-dot loading';
            statusText.textContent = 'Connecting...';
            
            try {
                // Set the new engine
                routingEngineManager.setEngine(engine);
                
                // Test connection
                const result = await routingEngineManager.testConnection();
                
                // Update status
                statusDot.className = 'status-dot';
                statusText.textContent = 'Connected';
                
                // Update UI based on engine capabilities
                updateUIForEngine(engine);
                
                // Clear route cache when switching engines
                routingEngineManager.clearCache();
                
                // Recalculate current route if exists
                if (routePlanner.waypoints.length >= 2) {
                    routePlanner.calculateRoute();
                }
                
                console.log(`Switched to ${engine} engine`, result);
            } catch (error) {
                // Show error state
                statusDot.className = 'status-dot error';
                statusText.textContent = 'Connection failed';
                
                console.error(`Failed to connect to ${engine}:`, error);
                
                // Revert to previous engine
                const previousEngine = routingEngineManager.currentEngine;
                document.querySelector(`input[value="${previousEngine}"]`).checked = true;
            }
        });
    });
    
    // Custom server toggle
    const useCustomServerCheckbox = document.getElementById('useCustomServer');
    const customServerInput = document.getElementById('customServerUrl');
    
    useCustomServerCheckbox.addEventListener('change', (e) => {
        customServerInput.disabled = !e.target.checked;
        
        if (e.target.checked && customServerInput.value) {
            const currentEngine = routingEngineManager.currentEngine;
            routingEngineManager.setCustomServer(currentEngine, customServerInput.value);
        }
    });
    
    customServerInput.addEventListener('input', (e) => {
        if (useCustomServerCheckbox.checked && e.target.value) {
            const currentEngine = routingEngineManager.currentEngine;
            routingEngineManager.setCustomServer(currentEngine, e.target.value);
        }
    });
    
    // Alternative routes toggle
    const enableAlternativesCheckbox = document.getElementById('enableAlternatives');
    enableAlternativesCheckbox.addEventListener('change', (e) => {
        routePlanner.preferences.alternatives = e.target.checked;
        
        if (routePlanner.waypoints.length >= 2) {
            routePlanner.calculateRoute();
        }
    });
    
    // Isochrone toggle
    const enableIsochronesCheckbox = document.getElementById('enableIsochrones');
    enableIsochronesCheckbox.addEventListener('change', (e) => {
        routePlanner.preferences.enableIsochrones = e.target.checked;
        updateIsochroneControls(e.target.checked);
    });
}

function updateUIForEngine(engine) {
    const capabilities = routingEngineManager.getCapabilities();
    
    // Update alternatives checkbox
    const alternativesCheckbox = document.getElementById('enableAlternatives');
    alternativesCheckbox.disabled = !capabilities.supportsAlternatives;
    if (!capabilities.supportsAlternatives) {
        alternativesCheckbox.checked = false;
    }
    
    // Update isochrones checkbox
    const isochronesCheckbox = document.getElementById('enableIsochrones');
    isochronesCheckbox.disabled = !capabilities.supportsIsochrones;
    if (!capabilities.supportsIsochrones) {
        isochronesCheckbox.checked = false;
    }
    
    // Update vehicle type options based on supported types
    updateVehicleTypeOptions(capabilities.supportedVehicleTypes);
    
    // Update preference options based on supported preferences
    updatePreferenceOptions(capabilities.supportedPreferences);
    
    // Show/hide bicycle-specific options for BRouter
    const isBRouter = engine === 'brouter';
    document.querySelectorAll('.bike-only').forEach(el => {
        el.style.display = isBRouter ? 'inline' : 'none';
    });
}

function updateVehicleTypeOptions(supportedTypes) {
    // Update vehicle type buttons based on what the engine supports
    const motorcycleBtn = document.querySelector('[data-type="motorcycle"]');
    const bicycleBtn = document.querySelector('[data-type="bicycle"]');
    
    motorcycleBtn.disabled = !supportedTypes.includes('motorcycle');
    bicycleBtn.disabled = !supportedTypes.includes('bicycle');
    
    // If current vehicle type is not supported, switch to a supported one
    const routePlanner = window.routePlanner;
    if (!supportedTypes.includes(routePlanner.vehicleType)) {
        const newType = supportedTypes[0];
        routePlanner.vehicleType = newType;
        document.querySelector(`[data-type="${newType}"]`).click();
    }
}

function updatePreferenceOptions(supportedPreferences) {
    // Enable/disable preference controls based on what the engine supports
    const preferenceMap = {
        'avoidHighways': document.getElementById('avoidHighways'),
        'surfacePref': document.getElementById('surfacePref'),
        'elevationPref': document.getElementById('elevationPref')
    };
    
    Object.entries(preferenceMap).forEach(([pref, element]) => {
        if (element) {
            const isSupported = supportedPreferences.includes(pref);
            element.disabled = !isSupported;
            
            // Update visual state
            const container = element.closest('.toggle-item, .elevation-preference, .surface-preference');
            if (container) {
                container.style.opacity = isSupported ? '1' : '0.5';
            }
        }
    });
}

function updateIsochroneControls(enabled) {
    // This would show/hide isochrone-specific controls
    // For now, just log the state
    console.log('Isochrones', enabled ? 'enabled' : 'disabled');
}

// Initialize engine status on load
export async function initializeEngineStatus() {
    try {
        const result = await routingEngineManager.testConnection();
        const statusIndicator = document.getElementById('engineStatus');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        statusDot.className = 'status-dot';
        statusText.textContent = 'Connected';
        
        // Set initial UI state
        updateUIForEngine(routingEngineManager.currentEngine);
    } catch (error) {
        console.error('Failed to connect to default routing engine:', error);
    }
}