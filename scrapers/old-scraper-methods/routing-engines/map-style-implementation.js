/**
 * Map Style Switching Implementation
 * Adds support for multiple map tile providers and styles
 */

class MapStyleManager {
    constructor(map) {
        this.map = map;
        this.currentStyle = 'light';
        this.currentLayer = null;
        
        // Define available map styles with their tile providers
        this.mapStyles = {
            light: {
                name: 'Light',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors',
                options: {
                    maxZoom: 19,
                    minZoom: 1
                }
            },
            dark: {
                name: 'Dark',
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors © CARTO',
                options: {
                    maxZoom: 19,
                    minZoom: 1
                }
            },
            satellite: {
                name: 'Satellite',
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                options: {
                    maxZoom: 19,
                    minZoom: 1
                }
            },
            terrain: {
                name: 'Terrain',
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png',
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © OpenStreetMap contributors',
                options: {
                    maxZoom: 18,
                    minZoom: 1,
                    subdomains: 'abcd'
                }
            },
            outdoors: {
                name: 'Outdoors',
                url: 'https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apikey}',
                attribution: '© Thunderforest, © OpenStreetMap contributors',
                options: {
                    maxZoom: 22,
                    minZoom: 1,
                    apikey: 'YOUR_THUNDERFOREST_KEY' // Need API key
                }
            },
            cycling: {
                name: 'Cycling',
                url: 'https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apikey}',
                attribution: '© Thunderforest, © OpenStreetMap contributors',
                options: {
                    maxZoom: 22,
                    minZoom: 1,
                    apikey: 'YOUR_THUNDERFOREST_KEY' // Need API key
                }
            },
            mtb: {
                name: 'MTB',
                url: 'https://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors © mtbmap.cz',
                options: {
                    maxZoom: 18,
                    minZoom: 3
                }
            },
            topo: {
                name: 'Topographic',
                url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors, SRTM | © OpenTopoMap',
                options: {
                    maxZoom: 17,
                    minZoom: 1
                }
            },
            watercolor: {
                name: 'Watercolor',
                url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png',
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> — Map data © OpenStreetMap contributors',
                options: {
                    maxZoom: 16,
                    minZoom: 1,
                    subdomains: 'abcd'
                }
            }
        };
        
        // Additional premium providers (require API keys)
        this.premiumProviders = {
            mapbox: {
                streets: 'mapbox://styles/mapbox/streets-v11',
                outdoors: 'mapbox://styles/mapbox/outdoors-v11',
                satellite: 'mapbox://styles/mapbox/satellite-streets-v11',
                dark: 'mapbox://styles/mapbox/dark-v10',
                light: 'mapbox://styles/mapbox/light-v10'
            },
            maptiler: {
                streets: 'https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key={key}',
                outdoor: 'https://api.maptiler.com/maps/outdoor/256/{z}/{x}/{y}.png?key={key}',
                topo: 'https://api.maptiler.com/maps/topo/256/{z}/{x}/{y}.png?key={key}'
            }
        };
    }
    
    /**
     * Initialize map with default style
     */
    initialize() {
        this.switchStyle('light');
        this.createStyleControls();
    }
    
    /**
     * Switch to a different map style
     */
    switchStyle(styleName) {
        const style = this.mapStyles[styleName];
        if (!style) {
            console.error(`Map style '${styleName}' not found`);
            return;
        }
        
        // Remove current layer
        if (this.currentLayer) {
            this.map.removeLayer(this.currentLayer);
        }
        
        // Create new tile layer
        this.currentLayer = L.tileLayer(style.url, {
            attribution: style.attribution,
            ...style.options
        });
        
        // Add to map as base layer
        this.currentLayer.addTo(this.map);
        
        // Update current style
        this.currentStyle = styleName;
        
        // Update UI
        this.updateStyleButtons(styleName);
        
        // Emit style change event
        this.map.fire('stylechange', { style: styleName });
        
        // Apply style-specific adjustments
        this.applyStyleAdjustments(styleName);
    }
    
    /**
     * Create style control buttons
     */
    createStyleControls() {
        const StyleControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control map-style-control');
                
                // Create dropdown button
                const button = L.DomUtil.create('a', 'map-style-button', container);
                button.href = '#';
                button.title = 'Change map style';
                button.innerHTML = '🗺️';
                
                // Create dropdown menu
                const dropdown = L.DomUtil.create('div', 'map-style-dropdown', container);
                dropdown.style.display = 'none';
                
                // Add style options
                Object.entries(this.mapStyles).forEach(([key, style]) => {
                    const option = L.DomUtil.create('div', 'map-style-option', dropdown);
                    option.innerHTML = `
                        <span class="style-preview" data-style="${key}"></span>
                        <span class="style-name">${style.name}</span>
                    `;
                    option.dataset.style = key;
                    
                    if (key === this.currentStyle) {
                        option.classList.add('active');
                    }
                    
                    L.DomEvent.on(option, 'click', (e) => {
                        L.DomEvent.stop(e);
                        this.switchStyle(key);
                        dropdown.style.display = 'none';
                    });
                });
                
                // Toggle dropdown
                L.DomEvent.on(button, 'click', (e) => {
                    L.DomEvent.stop(e);
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                });
                
                // Close dropdown when clicking outside
                L.DomEvent.on(document, 'click', () => {
                    dropdown.style.display = 'none';
                });
                
                // Prevent map interaction when using control
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.disableScrollPropagation(container);
                
                return container;
            }
        });
        
        this.styleControl = new StyleControl();
        this.map.addControl(this.styleControl);
    }
    
    /**
     * Update style button states
     */
    updateStyleButtons(activeStyle) {
        const options = document.querySelectorAll('.map-style-option');
        options.forEach(option => {
            if (option.dataset.style === activeStyle) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
    
    /**
     * Apply style-specific adjustments
     */
    applyStyleAdjustments(styleName) {
        const adjustments = {
            dark: {
                routeColor: '#00d4ff',
                waypointColor: '#ff6b6b',
                poiColor: '#ffd93d'
            },
            satellite: {
                routeColor: '#ff0000',
                waypointColor: '#ffff00',
                poiColor: '#00ff00'
            },
            terrain: {
                routeColor: '#0066cc',
                waypointColor: '#ff3300',
                poiColor: '#009900'
            },
            watercolor: {
                routeColor: '#2c3e50',
                waypointColor: '#e74c3c',
                poiColor: '#f39c12'
            }
        };
        
        const adjustment = adjustments[styleName];
        if (adjustment) {
            // Update route colors
            if (window.routePlanner && window.routePlanner.routeLine) {
                window.routePlanner.routeLine.setStyle({ color: adjustment.routeColor });
            }
            
            // Update other elements as needed
            document.documentElement.style.setProperty('--route-color', adjustment.routeColor);
            document.documentElement.style.setProperty('--waypoint-color', adjustment.waypointColor);
        }
    }
    
    /**
     * Get available styles
     */
    getAvailableStyles() {
        return Object.keys(this.mapStyles);
    }
    
    /**
     * Add custom map style
     */
    addCustomStyle(key, config) {
        this.mapStyles[key] = config;
    }
    
    /**
     * Set API keys for premium providers
     */
    setApiKeys(keys) {
        if (keys.thunderforest) {
            this.mapStyles.outdoors.options.apikey = keys.thunderforest;
            this.mapStyles.cycling.options.apikey = keys.thunderforest;
        }
        
        if (keys.mapbox) {
            // Add Mapbox styles
            this.addMapboxStyles(keys.mapbox);
        }
        
        if (keys.maptiler) {
            // Add MapTiler styles
            this.addMapTilerStyles(keys.maptiler);
        }
    }
    
    /**
     * Add Mapbox styles
     */
    addMapboxStyles(accessToken) {
        const mapboxStyles = {
            'mapbox-streets': {
                name: 'Mapbox Streets',
                url: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${accessToken}`,
                attribution: '© Mapbox © OpenStreetMap contributors',
                options: { maxZoom: 22, tileSize: 512, zoomOffset: -1 }
            },
            'mapbox-outdoors': {
                name: 'Mapbox Outdoors',
                url: `https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/{z}/{x}/{y}?access_token=${accessToken}`,
                attribution: '© Mapbox © OpenStreetMap contributors',
                options: { maxZoom: 22, tileSize: 512, zoomOffset: -1 }
            },
            'mapbox-satellite': {
                name: 'Mapbox Satellite',
                url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/tiles/{z}/{x}/{y}?access_token=${accessToken}`,
                attribution: '© Mapbox © OpenStreetMap contributors',
                options: { maxZoom: 22, tileSize: 512, zoomOffset: -1 }
            }
        };
        
        Object.assign(this.mapStyles, mapboxStyles);
    }
}

// CSS Styles for the map style switcher
const mapStyleCSS = `
<style>
/* Map Style Control */
.map-style-control {
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 5px rgba(0,0,0,0.4);
}

.map-style-button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    text-decoration: none;
    color: #333;
    cursor: pointer;
}

.map-style-button:hover {
    background: #f4f4f4;
}

.map-style-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    margin-top: 5px;
    min-width: 180px;
    z-index: 1000;
}

.map-style-option {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    cursor: pointer;
    transition: background 0.2s;
}

.map-style-option:hover {
    background: #f0f0f0;
}

.map-style-option.active {
    background: #e8f4f8;
    font-weight: 600;
}

.map-style-option.active::after {
    content: '✓';
    margin-left: auto;
    color: #4CAF50;
}

.style-preview {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    margin-right: 10px;
    border: 1px solid #ddd;
}

/* Style previews */
.style-preview[data-style="light"] {
    background: #f8f8f8;
}

.style-preview[data-style="dark"] {
    background: #1a1a1a;
}

.style-preview[data-style="satellite"] {
    background: linear-gradient(45deg, #4a7c59, #8fbc8f);
}

.style-preview[data-style="terrain"] {
    background: linear-gradient(45deg, #d2b48c, #8b7355);
}

.style-preview[data-style="outdoors"] {
    background: linear-gradient(45deg, #87ceeb, #98fb98);
}

.style-preview[data-style="cycling"] {
    background: linear-gradient(45deg, #ff69b4, #ffd700);
}

.style-preview[data-style="mtb"] {
    background: linear-gradient(45deg, #8b4513, #228b22);
}

.style-preview[data-style="topo"] {
    background: linear-gradient(45deg, #deb887, #696969);
}

.style-preview[data-style="watercolor"] {
    background: linear-gradient(45deg, #e6e6fa, #ffdab9);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
    .map-style-control {
        background: #2a2a2a;
    }
    
    .map-style-button {
        color: #fff;
    }
    
    .map-style-dropdown {
        background: #2a2a2a;
        color: #fff;
    }
    
    .map-style-option:hover {
        background: #3a3a3a;
    }
    
    .map-style-option.active {
        background: #404040;
    }
}

/* Mobile responsive */
@media (max-width: 768px) {
    .map-style-dropdown {
        min-width: 150px;
        font-size: 14px;
    }
    
    .map-style-option {
        padding: 8px 12px;
    }
}
</style>
`;

// Export for use in route planner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MapStyleManager, mapStyleCSS };
}