// Gear Collection Integration for Marketplace Listings

export class GearIntegration {
    constructor() {
        this.gearData = [];
        this.selectedGear = null;
    }

    // Load gear from collection
    async loadGearCollection() {
        try {
            // In production, this would be an API call
            // For now, using mock data
            const response = await this.mockGearAPI();
            this.gearData = response.gear;
            return this.gearData;
        } catch (error) {
            console.error('Error loading gear collection:', error);
            return [];
        }
    }

    // Mock API response (replace with actual API call)
    async mockGearAPI() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            gear: [
                {
                    id: 'gear-1',
                    category: 'Helmet',
                    brand: 'POC',
                    model: 'Ventral Air SPIN',
                    size: 'Medium',
                    color: 'Uranium Black',
                    condition: 'Like New',
                    purchaseDate: '2023-08-10',
                    purchasePrice: 290,
                    currentValue: 150,
                    usage: 'Light use, 5 rides',
                    images: ['/assets/images/gear/poc-helmet.jpg'],
                    specs: {
                        weight: '284g',
                        certification: 'CPSC, EN 1078',
                        features: 'SPIN technology, Aramid bridges'
                    }
                },
                {
                    id: 'gear-2',
                    category: 'Wheels',
                    brand: 'Zipp',
                    model: '404 Firecrest',
                    type: 'Carbon Clincher',
                    condition: 'Good',
                    purchaseDate: '2022-05-15',
                    purchasePrice: 2400,
                    currentValue: 1200,
                    usage: 'Approx 2000 miles',
                    images: ['/assets/images/gear/zipp-wheels.jpg'],
                    specs: {
                        depth: '58mm',
                        width: '27mm',
                        weight: '1690g',
                        hub: 'Shimano/SRAM 11-speed'
                    }
                },
                {
                    id: 'gear-3',
                    category: 'Groupset',
                    brand: 'Shimano',
                    model: 'Ultegra R8000',
                    type: '2x11 Mechanical',
                    condition: 'Good',
                    purchaseDate: '2021-03-20',
                    purchasePrice: 1200,
                    currentValue: 800,
                    usage: 'Approx 3000 miles',
                    images: ['/assets/images/gear/shimano-groupset.jpg'],
                    specs: {
                        speeds: '2x11',
                        crankset: '172.5mm 52/36T',
                        cassette: '11-28T',
                        brakes: 'Rim brake calipers included'
                    }
                },
                {
                    id: 'gear-4',
                    category: 'Clothing',
                    brand: 'Rapha',
                    model: 'Pro Team Aero Jersey',
                    size: 'Large',
                    color: 'Dark Navy/Pink',
                    condition: 'Excellent',
                    purchaseDate: '2024-01-15',
                    purchasePrice: 195,
                    currentValue: 120,
                    usage: 'Worn 3 times',
                    images: ['/assets/images/gear/rapha-jersey.jpg'],
                    specs: {
                        material: 'Lightweight mesh fabric',
                        fit: 'Race fit',
                        features: 'Full-length zipper, 3 rear pockets'
                    }
                },
                {
                    id: 'gear-5',
                    category: 'Shoes',
                    brand: 'Specialized',
                    model: 'S-Works 7',
                    size: 'EU 43',
                    color: 'Black',
                    condition: 'Good',
                    purchaseDate: '2022-09-10',
                    purchasePrice: 400,
                    currentValue: 200,
                    usage: 'Regular use, well maintained',
                    images: ['/assets/images/gear/specialized-shoes.jpg'],
                    specs: {
                        closure: 'Dual Boa',
                        sole: 'FACT Powerline carbon',
                        stiffness: '15.0',
                        weight: '224g'
                    }
                },
                {
                    id: 'gear-6',
                    category: 'Accessories',
                    brand: 'Wahoo',
                    model: 'ELEMNT ROAM',
                    type: 'GPS Computer',
                    condition: 'Excellent',
                    purchaseDate: '2023-11-20',
                    purchasePrice: 380,
                    currentValue: 280,
                    usage: 'Light use',
                    images: ['/assets/images/gear/wahoo-roam.jpg'],
                    specs: {
                        screen: '2.7" color display',
                        battery: '17 hours',
                        connectivity: 'Bluetooth, ANT+, WiFi',
                        features: 'Turn-by-turn navigation, Strava Live'
                    }
                }
            ]
        };
    }

    // Render gear grid
    renderGearGrid(container) {
        if (!this.gearData.length) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const gearCards = this.gearData.map(item => this.renderGearCard(item)).join('');
        container.innerHTML = gearCards;
    }

    // Render individual gear card
    renderGearCard(item) {
        const mainImage = item.images[0] || '/assets/images/placeholder-gear.jpg';
        const categoryIcon = this.getCategoryIcon(item.category);
        
        return `
            <div class="item-card" data-gear-id="${item.id}">
                <img src="${mainImage}" alt="${item.brand} ${item.model}" class="item-image">
                <div class="item-info">
                    <h3 class="item-title">${categoryIcon} ${item.brand} ${item.model}</h3>
                    <div class="item-specs">
                        ${item.category} • ${item.size || item.type || ''} • ${item.usage}
                    </div>
                    <span class="item-condition">${item.condition}</span>
                    <div class="item-value">Est. value: ${this.formatPrice(item.currentValue)}</div>
                </div>
            </div>
        `;
    }

    // Render empty state
    renderEmptyState() {
        return `
            <div class="items-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                    <path d="M20.5 7.5L16 12l4.5 4.5M3.5 7.5L8 12l-4.5 4.5"/>
                </svg>
                <h3>No gear in your collection</h3>
                <p>Add gear to your collection to list it for sale</p>
                <a href="/gear-collection" class="btn-primary">Go to Gear Collection</a>
            </div>
        `;
    }

    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            'Helmet': '🪖',
            'Wheels': '⚙️',
            'Groupset': '🔧',
            'Clothing': '👕',
            'Shoes': '👟',
            'Accessories': '📱',
            'Pedals': '🦶',
            'Saddle': '🪑',
            'Handlebars': '🎯',
            'Lights': '💡'
        };
        return icons[category] || '📦';
    }

    // Select gear item
    selectGear(gearId) {
        this.selectedGear = this.gearData.find(item => item.id === gearId);
        return this.selectedGear;
    }

    // Populate form with gear data
    populateFormWithGear(gear) {
        if (!gear) return;

        // This would populate the listing form with gear data
        const formData = {
            category: this.mapGearCategory(gear.category),
            brand: gear.brand,
            model: gear.model,
            condition: gear.condition.toLowerCase(),
            title: `${gear.brand} ${gear.model} - ${gear.category}`,
            description: this.generateDescription(gear),
            price: gear.currentValue,
            images: gear.images,
            // Additional fields based on gear data
            size: gear.size,
            type: gear.type,
            specs: gear.specs
        };

        return formData;
    }

    // Map gear category to marketplace category
    mapGearCategory(gearCategory) {
        const categoryMap = {
            'Helmet': 'accessories',
            'Wheels': 'wheels',
            'Groupset': 'components',
            'Clothing': 'apparel',
            'Shoes': 'apparel',
            'Accessories': 'accessories',
            'Pedals': 'components',
            'Saddle': 'components',
            'Handlebars': 'components',
            'Lights': 'accessories'
        };
        return categoryMap[gearCategory] || 'accessories';
    }

    // Generate description from gear data
    generateDescription(gear) {
        let description = `${gear.brand} ${gear.model} ${gear.category.toLowerCase()} in ${gear.condition.toLowerCase()} condition. `;
        
        if (gear.size) {
            description += `Size: ${gear.size}. `;
        }
        
        if (gear.type) {
            description += `Type: ${gear.type}. `;
        }
        
        if (gear.color) {
            description += `Color: ${gear.color}. `;
        }
        
        description += `${gear.usage}.\n\n`;
        
        if (gear.specs && Object.keys(gear.specs).length > 0) {
            description += `Specifications:\n`;
            for (const [key, value] of Object.entries(gear.specs)) {
                description += `• ${this.formatSpecKey(key)}: ${value}\n`;
            }
            description += '\n';
        }
        
        description += `Purchased on ${gear.purchaseDate} for ${this.formatPrice(gear.purchasePrice)}. `;
        description += `Well maintained and stored properly.`;
        
        return description;
    }

    // Helper functions
    formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    formatSpecKey(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }
}

// Export for use in main app
window.GearIntegration = GearIntegration;