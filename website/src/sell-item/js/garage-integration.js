// Virtual Garage Integration for Marketplace Listings

export class GarageIntegration {
    constructor() {
        this.garageData = [];
        this.selectedBike = null;
    }

    // Load bikes from virtual garage
    async loadGarageBikes() {
        try {
            // In production, this would be an API call
            // For now, using mock data
            const response = await this.mockGarageAPI();
            this.garageData = response.bikes;
            return this.garageData;
        } catch (error) {
            console.error('Error loading garage bikes:', error);
            return [];
        }
    }

    // Mock API response (replace with actual API call)
    async mockGarageAPI() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            bikes: [
                {
                    id: 'bike-1',
                    brand: 'Trek',
                    model: 'Domane SL 7',
                    year: 2023,
                    type: 'Road Bike',
                    size: '56cm',
                    color: 'Matte Black',
                    condition: 'Excellent',
                    purchaseDate: '2023-03-15',
                    purchasePrice: 5499,
                    currentValue: 3500,
                    mileage: 1250,
                    images: ['/assets/images/bikes/trek-domane.jpg'],
                    specs: {
                        frame: 'OCLV Carbon',
                        groupset: 'Shimano Ultegra Di2',
                        wheels: 'Bontrager Aeolus Pro 3V',
                        weight: '8.2kg'
                    },
                    maintenanceHistory: [
                        { date: '2024-01-15', type: 'Service', description: 'Annual service' }
                    ]
                },
                {
                    id: 'bike-2',
                    brand: 'Specialized',
                    model: 'Diverge Comp',
                    year: 2023,
                    type: 'Gravel Bike',
                    size: '56cm',
                    color: 'Satin Forest Green',
                    condition: 'Like New',
                    purchaseDate: '2023-06-20',
                    purchasePrice: 3200,
                    currentValue: 2800,
                    mileage: 450,
                    images: ['/assets/images/bikes/specialized-diverge.jpg'],
                    specs: {
                        frame: 'Specialized FACT 9r Carbon',
                        groupset: 'Shimano GRX 810',
                        wheels: 'DT Swiss G540',
                        weight: '9.5kg'
                    },
                    maintenanceHistory: []
                },
                {
                    id: 'bike-3',
                    brand: 'Yamaha',
                    model: 'YZF-R6',
                    year: 2019,
                    type: 'Motorcycle',
                    engineSize: '599cc',
                    color: 'Team Yamaha Blue',
                    condition: 'Excellent',
                    purchaseDate: '2020-04-10',
                    purchasePrice: 12000,
                    currentValue: 9500,
                    mileage: 8500,
                    images: ['/assets/images/bikes/yamaha-r6.jpg'],
                    specs: {
                        engine: '599cc Inline-4',
                        power: '117 HP',
                        torque: '61.7 Nm',
                        weight: '190kg'
                    },
                    maintenanceHistory: [
                        { date: '2024-03-01', type: 'Service', description: 'Oil change, chain adjustment' },
                        { date: '2023-09-15', type: 'Service', description: 'Annual service, new tires' }
                    ]
                }
            ]
        };
    }

    // Render bikes grid
    renderBikesGrid(container) {
        if (!this.garageData.length) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const bikeCards = this.garageData.map(bike => this.renderBikeCard(bike)).join('');
        container.innerHTML = bikeCards;
    }

    // Render individual bike card
    renderBikeCard(bike) {
        const mainImage = bike.images[0] || '/assets/images/placeholder-bike.jpg';
        const bikeType = bike.type === 'Motorcycle' ? '🏍️' : '🚴';
        
        return `
            <div class="item-card" data-bike-id="${bike.id}">
                <img src="${mainImage}" alt="${bike.brand} ${bike.model}" class="item-image">
                <div class="item-info">
                    <h3 class="item-title">${bikeType} ${bike.brand} ${bike.model}</h3>
                    <div class="item-specs">
                        ${bike.year} • ${bike.size || bike.engineSize} • ${this.formatMileage(bike.mileage)}
                    </div>
                    <span class="item-condition">${bike.condition}</span>
                    <div class="item-value">Est. value: ${this.formatPrice(bike.currentValue)}</div>
                </div>
            </div>
        `;
    }

    // Render empty state
    renderEmptyState() {
        return `
            <div class="items-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 7l7-4 7 4v10l-7 4-7-4V7z"/>
                    <path d="M5 7l7 4 7-4"/>
                    <path d="M12 11v10"/>
                </svg>
                <h3>No bikes in your garage</h3>
                <p>Add bikes to your virtual garage to list them for sale</p>
                <a href="/virtual-garage" class="btn-primary">Go to Virtual Garage</a>
            </div>
        `;
    }

    // Select a bike
    selectBike(bikeId) {
        this.selectedBike = this.garageData.find(bike => bike.id === bikeId);
        return this.selectedBike;
    }

    // Populate form with bike data
    populateFormWithBike(bike) {
        if (!bike) return;

        // This would populate the listing form with bike data
        const formData = {
            category: bike.type.toLowerCase().replace(' ', '-'),
            brand: bike.brand,
            model: bike.model,
            year: bike.year,
            condition: bike.condition.toLowerCase(),
            title: `${bike.year} ${bike.brand} ${bike.model}`,
            description: this.generateDescription(bike),
            price: bike.currentValue,
            images: bike.images,
            // Additional fields based on bike data
            size: bike.size,
            engineSize: bike.engineSize,
            mileage: bike.mileage,
            specs: bike.specs
        };

        return formData;
    }

    // Generate description from bike data
    generateDescription(bike) {
        let description = `${bike.year} ${bike.brand} ${bike.model} in ${bike.condition.toLowerCase()} condition. `;
        
        if (bike.type === 'Motorcycle') {
            description += `${bike.engineSize} engine with ${this.formatMileage(bike.mileage)} on the odometer. `;
        } else {
            description += `Size ${bike.size} with ${this.formatMileage(bike.mileage)} ridden. `;
        }
        
        description += `\n\nSpecs:\n`;
        for (const [key, value] of Object.entries(bike.specs)) {
            description += `• ${this.formatSpecKey(key)}: ${value}\n`;
        }
        
        if (bike.maintenanceHistory.length > 0) {
            description += `\nRecent maintenance:\n`;
            bike.maintenanceHistory.slice(0, 3).forEach(record => {
                description += `• ${record.date}: ${record.description}\n`;
            });
        }
        
        description += `\nPurchased on ${bike.purchaseDate} for ${this.formatPrice(bike.purchasePrice)}.`;
        
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

    formatMileage(mileage) {
        if (mileage < 1000) {
            return `${mileage} miles`;
        }
        return `${(mileage / 1000).toFixed(1)}k miles`;
    }

    formatSpecKey(key) {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
    }
}

// Export for use in main app
window.GarageIntegration = GarageIntegration;