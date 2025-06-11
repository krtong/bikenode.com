// API functions for loading data from the backend

const API_BASE = 'http://localhost:8080/api';

// Load category statistics
export async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) throw new Error('Failed to load health status');
        
        const data = await response.json();
        return {
            motorcycles: data.motorcycles || 0,
            bicycles: data.bicycles || 0,
            electrified: data.electrified || 0
        };
    } catch (error) {
        console.error('Error loading categories:', error);
        return { motorcycles: 0, bicycles: 0, electrified: 0 };
    }
}

// Load brands for a vehicle type
export async function loadBrands(type) {
    try {
        let endpoint;
        switch(type) {
            case 'motorcycle':
                endpoint = `${API_BASE}/motorcycles/makes`;
                break;
            case 'bicycle':
                endpoint = `${API_BASE}/bicycles/manufacturers`;
                break;
            case 'electrified':
                endpoint = `${API_BASE}/electrified/brands`;
                break;
            default:
                throw new Error('Unknown vehicle type');
        }
            
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to load brands');
        
        const data = await response.json();
        
        // Normalize the data format
        if (type === 'bicycle' && data.manufacturers) {
            return data.manufacturers.map(brand => ({
                name: brand,
                count: null
            }));
        }
        
        if (type === 'electrified' && data.brands) {
            return data.brands.map(brand => ({
                name: brand.name || brand,
                count: brand.count || null
            }));
        }
        
        // For motorcycles, the API returns an array of strings
        return (data || []).map(brand => ({
            name: brand,
            count: null
        }));
    } catch (error) {
        console.error('Error loading brands:', error);
        return [];
    }
}

// Load years for a brand
export async function loadYears(type, brand) {
    try {
        let endpoint;
        switch(type) {
            case 'motorcycle':
                endpoint = `${API_BASE}/motorcycles/years/${encodeURIComponent(brand)}`;
                break;
            case 'bicycle':
                endpoint = `${API_BASE}/bicycles/years/${encodeURIComponent(brand)}`;
                break;
            case 'electrified':
                endpoint = `${API_BASE}/electrified/years/${encodeURIComponent(brand)}`;
                break;
            default:
                throw new Error('Unknown vehicle type');
        }
            
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to load years');
        
        const data = await response.json();
        
        // Normalize the response
        if ((type === 'bicycle' || type === 'electrified') && data.years) {
            return data.years.sort((a, b) => b - a);
        }
        
        // For motorcycles
        return (data || []).sort((a, b) => b - a);
    } catch (error) {
        console.error('Error loading years:', error);
        return [];
    }
}

// Load models for a brand/year
export async function loadModels(type, brand, year) {
    try {
        let endpoint;
        switch(type) {
            case 'motorcycle':
                endpoint = `${API_BASE}/motorcycles/models/${encodeURIComponent(brand)}/${year}`;
                break;
            case 'bicycle':
                endpoint = `${API_BASE}/bicycles/models/${encodeURIComponent(brand)}/${year}`;
                break;
            case 'electrified':
                endpoint = `${API_BASE}/electrified/models/${encodeURIComponent(brand)}/${year}`;
                break;
            default:
                throw new Error('Unknown vehicle type');
        }
            
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to load models');
        
        const data = await response.json();
        
        if (type === 'bicycle' || type === 'electrified') {
            return {
                models: data.models || [],
                raw: data
            };
        }
        
        // For motorcycles, return the full data
        return {
            models: data || [],
            raw: data
        };
    } catch (error) {
        console.error('Error loading models:', error);
        return { models: [], raw: null };
    }
}

// Load variants for a model
export async function loadVariants(type, brand, year, model, modelData) {
    if (type === 'bicycle' || type === 'electrified') {
        try {
            const endpoint = type === 'bicycle'
                ? `${API_BASE}/bicycles/variants/${encodeURIComponent(brand)}/${year}/${encodeURIComponent(model)}`
                : `${API_BASE}/electrified/variants/${encodeURIComponent(brand)}/${year}/${encodeURIComponent(model)}`;
                
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to load variants');
            
            const data = await response.json();
            return data.variants || [];
        } catch (error) {
            console.error(`Error loading ${type} variants:`, error);
            return [];
        }
    } else if (type === 'motorcycle' && modelData) {
        // For motorcycles, filter variants from the full model data
        const allModels = modelData.raw || modelData.models || [];
        const variants = allModels.filter(m => m.model === model);
        
        // If only one variant exists, return empty to skip variant selection
        if (variants.length <= 1) {
            return [];
        }
        
        return variants;
    }
    
    return [];
}

// Load specifications
export async function loadSpecs(type, brand, year, model, variant, vehicleData) {
    if (type === 'bicycle' || type === 'electrified') {
        try {
            // For bicycles and electrified, use the variant name as the model in the API call
            const endpoint = type === 'bicycle'
                ? `${API_BASE}/bicycles/specs/${encodeURIComponent(brand)}/${year}/${encodeURIComponent(variant)}`
                : `${API_BASE}/electrified/specs/${encodeURIComponent(brand)}/${year}/${encodeURIComponent(variant)}`;
                
            const response = await fetch(endpoint);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    hasSpecs: data.hasSpecs,
                    specifications: data.specifications,
                    bike: data.bike || data.vehicle,
                    type: type
                };
            }
        } catch (error) {
            console.error(`Error loading ${type} specs:`, error);
        }
    } else if (type === 'motorcycle' && vehicleData && vehicleData.id) {
        try {
            const response = await fetch(`${API_BASE}/motorcycles/${vehicleData.id}/specs`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    hasSpecs: data.hasSpecs,
                    specifications: data.specifications,
                    vehicleData: vehicleData,
                    type: 'motorcycle'
                };
            }
        } catch (error) {
            console.error('Error loading motorcycle specs:', error);
        }
    }
    
    // Return basic specs if detailed specs not available
    return {
        hasSpecs: false,
        specifications: null,
        vehicleData: vehicleData,
        type: type
    };
}