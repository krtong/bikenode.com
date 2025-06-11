// Load vehicle data from API
export async function loadVehicleData() {
    console.log('=== DATA LOADER: Starting to load vehicle data ===');
    const bikeData = {
        categories: [
            { 
                id: 'bicycle', 
                icon: '🚴', 
                title: 'Bicycle', 
                description: 'Traditional and electric bicycles',
                preview: { icon: '🚴', name: 'Bicycle', desc: 'Eco-friendly transportation and recreation' }
            },
            { 
                id: 'motorcycle', 
                icon: '🏍️', 
                title: 'Motorcycle', 
                description: 'Motorcycles and scooters',
                preview: { icon: '🏍️', name: 'Motorcycle', desc: 'High-performance road machines' }
            }
        ],
        brands: {
            bicycle: [],
            motorcycle: []
        },
        years: [],
        models: {}
    };

    try {
        console.log('Loading vehicle data from API...');
        
        // Load motorcycle brands
        console.log('Fetching from: http://localhost:8080/api/motorcycles/makes');
        const motorcycleResp = await fetch('http://localhost:8080/api/motorcycles/makes');
        console.log('Motorcycle response status:', motorcycleResp.status);
        const motorcycleData = await motorcycleResp.json();
        console.log('Raw motorcycle data:', motorcycleData);
        console.log('First 5 motorcycle brands:', motorcycleData?.slice(0, 5));
        
        // Map of brand names to favicon files (downloaded from brand websites)
        const brandFavicons = {
            'Yamaha': 'yamaha.ico',
            'Kawasaki': 'kawasaki.ico',
            'Ducati': 'ducati.ico',
            'Harley-Davidson': 'harley-davidson.ico',
            'Triumph': 'triumph.ico',
            'Indian': 'indian.ico',
            'MV Agusta': 'mv-agusta.ico',
            'Benelli': 'benelli.ico',
            'CFMoto': 'cfmoto.ico',
            'Zero': 'zero.ico',
            'Energica': 'energica.ico',
            'Polaris': 'polaris.ico',
            'Bajaj': 'bajaj.ico'
        };
        
        bikeData.brands.motorcycle = (motorcycleData || []).map(brand => {
            const faviconFile = brandFavicons[brand];
            const faviconPath = faviconFile ? `/assets/images/motorcycle-favicons/${faviconFile}` : null;
            
            return {
                id: brand.toLowerCase().replace(/[^a-z0-9]/g, ''),
                title: brand,
                description: `${brand} motorcycles`,
                preview: { icon: '🏍️', name: brand, desc: `Explore ${brand} motorcycles` },
                favicon: faviconPath
            };
        });
        
        console.log(`Loaded ${bikeData.brands.motorcycle.length} motorcycle brands`);
        console.log('Sample motorcycle brand object:', bikeData.brands.motorcycle[0]);
        
        // Load bicycle brands
        console.log('Fetching from: http://localhost:8080/api/bicycles/manufacturers');
        const bicycleResp = await fetch('http://localhost:8080/api/bicycles/manufacturers');
        console.log('Bicycle response status:', bicycleResp.status);
        const bicycleData = await bicycleResp.json();
        console.log('Raw bicycle data:', bicycleData);
        bikeData.brands.bicycle = (bicycleData.manufacturers || []).map(brand => ({
            id: brand.toLowerCase().replace(/[^a-z0-9]/g, ''),
            title: brand,
            description: `${brand} bicycles`,
            preview: { icon: '🚴', name: brand, desc: `Explore ${brand} bicycles` }
        }));
        
        console.log(`Loaded ${bikeData.brands.bicycle.length} bicycle brands`);
        console.log('Sample bicycle brand object:', bikeData.brands.bicycle[0]);
        console.log('=== DATA LOADER: Complete bikeData structure ===');
        console.log(bikeData);
        
    } catch (error) {
        console.error('Error loading vehicle data:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        // Don't alert, just log
        document.getElementById('menu-content').innerHTML = `
            <div style="padding: 20px; color: #ff4444;">
                <h3>Error Loading Data</h3>
                <p>${error.message}</p>
                <p>Check browser console for details</p>
            </div>
        `;
    }

    return bikeData;
}