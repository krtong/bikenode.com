// MTB Routing Handler
import { routingEngineManager } from './routing-engines.js';

export function setupMTBHandlers(routePlanner) {
    // Show/hide MTB preferences based on vehicle type and surface preference
    const updateMTBVisibility = () => {
        const mtbPrefs = document.getElementById('mtbPreferences');
        const isBicycle = routePlanner.vehicleType === 'bicycle';
        const isTrailSurface = document.getElementById('surfacePref')?.value === 'trails';
        const isBRouter = routingEngineManager.currentEngine === 'brouter';
        
        if (mtbPrefs) {
            mtbPrefs.style.display = (isBicycle && (isTrailSurface || isBRouter)) ? 'block' : 'none';
        }
    };
    
    // Listen for vehicle type changes
    document.querySelectorAll('.route-type').forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(updateMTBVisibility, 100);
        });
    });
    
    // Listen for surface preference changes
    document.getElementById('surfacePref')?.addEventListener('change', updateMTBVisibility);
    
    // Listen for routing engine changes
    document.querySelectorAll('input[name="routingEngine"]').forEach(radio => {
        radio.addEventListener('change', updateMTBVisibility);
    });
    
    // Trail difficulty checkboxes
    document.querySelectorAll('input[name="difficulty"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateMTBPreferences(routePlanner);
        });
    });
    
    // Trail type toggles
    ['singletrack', 'doubletrack', 'fireRoad', 'bikeParks'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            updateMTBPreferences(routePlanner);
        });
    });
    
    // Technical features toggles
    ['jumps', 'berms', 'rockGardens', 'roots'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => {
            updateMTBPreferences(routePlanner);
        });
    });
    
    // MTB style selector
    document.getElementById('mtbStyle')?.addEventListener('change', (e) => {
        routePlanner.preferences.mtbStyle = e.target.value;
        updateMTBPreferences(routePlanner);
    });
    
    // Surface natural/built slider
    document.getElementById('surfaceNatural')?.addEventListener('input', (e) => {
        routePlanner.preferences.surfaceNatural = parseInt(e.target.value);
        updateMTBPreferences(routePlanner);
    });
    
    // Flow/technical slider
    document.getElementById('flowTechnical')?.addEventListener('input', (e) => {
        routePlanner.preferences.flowTechnical = parseInt(e.target.value);
        updateMTBPreferences(routePlanner);
    });
    
    // Initialize visibility
    updateMTBVisibility();
}

function updateMTBPreferences(routePlanner) {
    // Collect all MTB preferences
    const mtbPrefs = {
        difficulties: [],
        trailTypes: {
            singletrack: document.getElementById('singletrack')?.checked,
            doubletrack: document.getElementById('doubletrack')?.checked,
            fireRoad: document.getElementById('fireRoad')?.checked,
            bikeParks: document.getElementById('bikeParks')?.checked
        },
        features: {
            jumps: document.getElementById('jumps')?.checked,
            berms: document.getElementById('berms')?.checked,
            rockGardens: document.getElementById('rockGardens')?.checked,
            roots: document.getElementById('roots')?.checked
        },
        style: document.getElementById('mtbStyle')?.value || 'trail',
        surfaceNatural: parseInt(document.getElementById('surfaceNatural')?.value || 70),
        flowTechnical: parseInt(document.getElementById('flowTechnical')?.value || 50)
    };
    
    // Get selected difficulties
    document.querySelectorAll('input[name="difficulty"]:checked').forEach(checkbox => {
        mtbPrefs.difficulties.push(parseInt(checkbox.value));
    });
    
    // Update route planner preferences
    routePlanner.preferences.mtb = mtbPrefs;
    
    // If using BRouter, update the custom profile
    if (routingEngineManager.currentEngine === 'brouter') {
        updateBRouterMTBProfile(mtbPrefs);
    }
    
    // Recalculate route if we have waypoints
    if (routePlanner.waypoints.length >= 2) {
        routePlanner.calculateRoute();
    }
}

function updateBRouterMTBProfile(mtbPrefs) {
    // Build custom BRouter parameters based on MTB preferences
    const params = {
        customProfile: 'mtb-custom',
        profileParams: []
    };
    
    // Adjust for difficulty preferences
    const maxDifficulty = Math.max(...mtbPrefs.difficulties, 0);
    params.profileParams.push(`assign max_mtb_scale ${maxDifficulty + 1}`);
    
    // Adjust for trail type preferences
    if (!mtbPrefs.trailTypes.singletrack) {
        params.profileParams.push('assign avoid_singletrack 1');
    }
    if (!mtbPrefs.trailTypes.fireRoad) {
        params.profileParams.push('assign prefer_singletrack 1.5');
    }
    
    // Adjust for riding style
    switch (mtbPrefs.style) {
        case 'xc':
            params.profileParams.push('assign uphillcost 150');
            params.profileParams.push('assign downhillcost 50');
            break;
        case 'downhill':
            params.profileParams.push('assign uphillcost 300');
            params.profileParams.push('assign downhillcost 20');
            break;
        case 'enduro':
            params.profileParams.push('assign uphillcost 200');
            params.profileParams.push('assign downhillcost 30');
            break;
    }
    
    // Adjust for flow vs technical preference
    if (mtbPrefs.flowTechnical < 30) {
        params.profileParams.push('assign prefer_flow_trails 1.5');
    } else if (mtbPrefs.flowTechnical > 70) {
        params.profileParams.push('assign prefer_technical_trails 1.5');
    }
    
    // Store custom parameters for BRouter
    routingEngineManager.engines.brouter.customMTBParams = params;
}

// Export function to get MTB-specific routing parameters
export function getMTBRoutingParams(routePlanner) {
    if (!routePlanner.preferences.mtb) {
        return null;
    }
    
    const mtbPrefs = routePlanner.preferences.mtb;
    
    // Build Overpass API query for finding MTB trails
    const overpassQuery = buildMTBOverpassQuery(mtbPrefs);
    
    // Build routing constraints
    const constraints = {
        avoidHighways: true,
        preferTrails: true,
        maxDifficulty: Math.max(...mtbPrefs.difficulties, 0),
        trailTypes: mtbPrefs.trailTypes,
        features: mtbPrefs.features
    };
    
    return {
        overpassQuery,
        constraints,
        customProfile: getMTBProfile(mtbPrefs)
    };
}

function buildMTBOverpassQuery(mtbPrefs) {
    const difficulties = mtbPrefs.difficulties.map(d => `mtb:scale=${d}`).join('|');
    
    let query = `
    [out:json];
    (
        way["highway"="path"]["bicycle"!="no"]({{bbox}});
        way["highway"="track"]["bicycle"!="no"]({{bbox}});
        way["highway"="cycleway"]({{bbox}});
    `;
    
    if (mtbPrefs.trailTypes.singletrack) {
        query += `way["singletrack"="yes"]({{bbox}});`;
    }
    
    if (difficulties.length > 0) {
        query += `way[~"${difficulties}"]({{bbox}});`;
    }
    
    query += `
    );
    out geom;
    `;
    
    return query;
}

function getMTBProfile(mtbPrefs) {
    // Return appropriate profile name based on preferences
    if (mtbPrefs.style === 'downhill' && mtbPrefs.flowTechnical > 70) {
        return 'mtb-extreme';
    } else if (mtbPrefs.surfaceNatural > 80) {
        return 'mtb-singletrack';
    } else if (mtbPrefs.style === 'xc') {
        return 'mtb-xc';
    }
    
    return 'mtb';
}