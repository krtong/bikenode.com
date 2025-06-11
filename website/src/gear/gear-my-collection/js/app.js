// Gear Collection App
class GearCollectionApp {
    constructor() {
        this.gear = [];
        this.filteredGear = [];
        this.currentCategory = 'all';
        this.currentFilters = {
            brands: [],
            favorites: false,
            inUse: false,
            wishlist: false
        };
        this.currentSort = 'recent';
        this.currentView = 'grid';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadGear();
        this.loadBrands();
    }
    
    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.category-card').forEach(btn => {
            btn.addEventListener('click', () => this.filterByCategory(btn.dataset.category));
        });
        
        // Sort dropdown
        document.getElementById('sortBy')?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.applyFiltersAndSort();
        });
        
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => this.changeView(btn.dataset.view));
        });
        
        // Quick filters
        document.getElementById('filterFavorites')?.addEventListener('change', (e) => {
            this.currentFilters.favorites = e.target.checked;
            this.applyFiltersAndSort();
        });
        
        document.getElementById('filterInUse')?.addEventListener('change', (e) => {
            this.currentFilters.inUse = e.target.checked;
            this.applyFiltersAndSort();
        });
        
        document.getElementById('filterWishlist')?.addEventListener('change', (e) => {
            this.currentFilters.wishlist = e.target.checked;
            this.applyFiltersAndSort();
        });
        
        // Brand search
        document.getElementById('brandSearch')?.addEventListener('input', (e) => {
            this.filterBrandList(e.target.value);
        });
        
        // Photo upload
        const photoUpload = document.getElementById('gearPhotoUpload');
        const photoInput = document.getElementById('gearPhotoInput');
        
        if (photoUpload && photoInput) {
            photoUpload.addEventListener('click', () => photoInput.click());
            
            photoUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                photoUpload.classList.add('drag-over');
            });
            
            photoUpload.addEventListener('dragleave', () => {
                photoUpload.classList.remove('drag-over');
            });
            
            photoUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                photoUpload.classList.remove('drag-over');
                this.handlePhotos(e.dataTransfer.files);
            });
            
            photoInput.addEventListener('change', (e) => {
                this.handlePhotos(e.target.files);
            });
        }
        
        // Category change in add form
        document.getElementById('gearCategory')?.addEventListener('change', (e) => {
            this.updateSubcategories(e.target.value);
        });
    }
    
    async loadGear() {
        try {
            const response = await fetch('http://localhost:8081/api/user/gear-collection', {
                credentials: 'include'
            });
            
            if (response.ok) {
                this.gear = await response.json();
                this.applyFiltersAndSort();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading gear:', error);
        }
    }
    
    async loadBrands() {
        try {
            const response = await fetch('http://localhost:8081/api/gear/brands', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const brands = await response.json();
                this.displayBrands(brands);
            }
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }
    
    displayBrands(brands) {
        const brandList = document.getElementById('brandList');
        if (!brandList) return;
        
        brandList.innerHTML = brands.map(brand => `
            <label class="brand-item">
                <input type="checkbox" class="brand-checkbox" value="${brand.name}">
                <span class="brand-name">${brand.name}</span>
                <span class="brand-count">${brand.count}</span>
            </label>
        `).join('');
        
        // Add event listeners to brand checkboxes
        brandList.querySelectorAll('.brand-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBrandFilter();
            });
        });
    }
    
    updateBrandFilter() {
        const checkedBrands = Array.from(document.querySelectorAll('.brand-checkbox:checked'))
            .map(checkbox => checkbox.value);
        
        this.currentFilters.brands = checkedBrands;
        this.applyFiltersAndSort();
        this.updateActiveFilters();
    }
    
    filterByCategory(category) {
        // Update active state
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.toggle('active', card.dataset.category === category);
        });
        
        this.currentCategory = category;
        this.applyFiltersAndSort();
    }
    
    applyFiltersAndSort() {
        // Start with all gear
        let filtered = [...this.gear];
        
        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(item => item.category === this.currentCategory);
        }
        
        // Apply brand filter
        if (this.currentFilters.brands.length > 0) {
            filtered = filtered.filter(item => 
                this.currentFilters.brands.includes(item.brand)
            );
        }
        
        // Apply quick filters
        if (this.currentFilters.favorites) {
            filtered = filtered.filter(item => item.isFavorite);
        }
        
        if (this.currentFilters.inUse) {
            filtered = filtered.filter(item => item.isInUse);
        }
        
        if (this.currentFilters.wishlist) {
            filtered = filtered.filter(item => item.ownership === 'wishlist');
        }
        
        // Apply sorting
        filtered = this.sortGear(filtered);
        
        this.filteredGear = filtered;
        this.displayGear();
        this.updateCategoryCounts();
    }
    
    sortGear(gear) {
        const sortFunctions = {
            'recent': (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
            'name': (a, b) => a.model.localeCompare(b.model),
            'brand': (a, b) => a.brand.localeCompare(b.brand),
            'price-high': (a, b) => (b.price || 0) - (a.price || 0),
            'price-low': (a, b) => (a.price || 0) - (b.price || 0),
            'rating': (a, b) => (b.rating || 0) - (a.rating || 0),
            'most-used': (a, b) => (b.usageCount || 0) - (a.usageCount || 0)
        };
        
        const sortFunc = sortFunctions[this.currentSort] || sortFunctions['recent'];
        return gear.sort(sortFunc);
    }
    
    displayGear() {
        const grid = document.getElementById('gearGrid');
        if (!grid) return;
        
        if (this.filteredGear.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <h3>No gear found</h3>
                    <p>Try adjusting your filters or add some gear to your collection</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredGear.map(item => this.createGearCard(item)).join('');
    }
    
    createGearCard(item) {
        const costPerUse = item.usageCount > 0 ? (item.price / item.usageCount).toFixed(2) : '-';
        const ratingStars = '★'.repeat(item.rating || 0) + '☆'.repeat(5 - (item.rating || 0));
        
        return `
            <div class="gear-card" data-gear-id="${item.id}">
                <div class="gear-image">
                    ${item.photos && item.photos[0] 
                        ? `<img src="${item.photos[0]}" alt="${item.brand} ${item.model}">`
                        : `<div class="no-image">${this.getCategoryIcon(item.category)}</div>`
                    }
                    <div class="gear-badges">
                        <span class="badge category-badge">${item.category}</span>
                        ${item.isFavorite ? '<span class="badge favorite-badge">⭐</span>' : ''}
                        ${item.ownership === 'wishlist' ? '<span class="badge wishlist-badge">💝</span>' : ''}
                    </div>
                    <div class="gear-overlay">
                        <button class="overlay-btn" onclick="gearApp.quickView('${item.id}')">Quick View</button>
                    </div>
                </div>
                <div class="gear-content">
                    <div class="gear-header">
                        <h3 class="gear-name">${item.model}</h3>
                        <div class="gear-rating">
                            <span class="stars">${ratingStars}</span>
                        </div>
                    </div>
                    <p class="gear-brand">${item.brand}</p>
                    <div class="gear-details">
                        ${item.size ? `<span>${item.size}</span>` : ''}
                        ${item.color ? `<span>${item.color}</span>` : ''}
                    </div>
                    <div class="gear-stats">
                        <div class="stat">
                            <span class="stat-label">Used</span>
                            <span class="stat-value usage-count">${item.usageCount || 0} times</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Cost/Use</span>
                            <span class="stat-value cost-per-use">$${costPerUse}</span>
                        </div>
                    </div>
                    <div class="gear-tags">
                        ${item.tags.map(tag => `<span>${this.formatTag(tag)}</span>`).join('')}
                    </div>
                </div>
                <div class="gear-actions">
                    <button class="action-btn ${item.isFavorite ? 'active' : ''}" onclick="gearApp.toggleFavorite('${item.id}')" title="Toggle Favorite">
                        <span class="icon">❤️</span>
                    </button>
                    <button class="action-btn" onclick="gearApp.logUsage('${item.id}')" title="Log Usage">
                        <span class="icon">✓</span>
                    </button>
                    <button class="action-btn" onclick="gearApp.editGear('${item.id}')" title="Edit">
                        <span class="icon">✏️</span>
                    </button>
                    <button class="action-btn" onclick="gearApp.moreOptions('${item.id}')" title="More">
                        <span class="icon">⋮</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    getCategoryIcon(category) {
        const icons = {
            'jerseys': '👕',
            'bibs': '🩳',
            'jackets': '🧥',
            'shoes': '👟',
            'helmets': '🪖',
            'gloves': '🧤',
            'eyewear': '🥽',
            'bags': '🎒',
            'tools': '🔧',
            'lights': '💡',
            'computers': '📱',
            'bottles': '🥤'
        };
        return icons[category] || '📦';
    }
    
    formatTag(tag) {
        return tag.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    updateStats() {
        // Total items
        document.getElementById('totalGearCount').textContent = this.gear.length;
        
        // Total brands
        const brands = [...new Set(this.gear.map(item => item.brand))];
        document.getElementById('totalBrands').textContent = brands.length;
        
        // Total value
        const totalValue = this.gear.reduce((sum, item) => sum + (item.price || 0), 0);
        document.getElementById('totalValue').textContent = totalValue.toFixed(0);
        
        // Favorite brand (most items)
        const brandCounts = {};
        this.gear.forEach(item => {
            brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
        });
        const favoriteBrand = Object.entries(brandCounts)
            .sort((a, b) => b[1] - a[1])[0];
        document.getElementById('favoriteBrand').textContent = favoriteBrand ? favoriteBrand[0] : '-';
    }
    
    updateCategoryCounts() {
        const categoryCounts = {};
        this.gear.forEach(item => {
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        });
        
        document.querySelectorAll('.category-card').forEach(card => {
            const category = card.dataset.category;
            const count = category === 'all' ? this.gear.length : (categoryCounts[category] || 0);
            card.querySelector('.category-count').textContent = count;
        });
    }
    
    showAddGearModal() {
        document.getElementById('addGearModal').classList.add('active');
    }
    
    closeAddGearModal() {
        document.getElementById('addGearModal').classList.remove('active');
        document.getElementById('addGearForm').reset();
        document.getElementById('gearPhotoPreview').innerHTML = '';
    }
    
    handlePhotos(files) {
        const preview = document.getElementById('gearPhotoPreview');
        preview.innerHTML = '';
        
        Array.from(files).slice(0, 6).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'photo-preview';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Photo ${index + 1}">
                    <button type="button" class="remove-photo" onclick="gearApp.removePhoto(${index})">×</button>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }
    
    async saveGear() {
        const form = document.getElementById('addGearForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const gearData = {
            ownership: formData.get('ownership'),
            category: formData.get('category'),
            brand: formData.get('brand'),
            model: formData.get('model'),
            size: formData.get('size'),
            color: formData.get('color'),
            purchaseDate: formData.get('purchaseDate'),
            price: parseFloat(formData.get('price')) || 0,
            rating: parseInt(formData.get('rating')) || 3,
            review: formData.get('review'),
            tags: Array.from(form.querySelectorAll('input[name="tags"]:checked'))
                .map(input => input.value)
        };
        
        try {
            const response = await fetch('http://localhost:8081/api/user/gear-collection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(gearData)
            });
            
            if (response.ok) {
                this.showSuccess('Gear added to your collection!');
                this.closeAddGearModal();
                this.loadGear();
            } else {
                this.showError('Failed to add gear. Please try again.');
            }
        } catch (error) {
            console.error('Error saving gear:', error);
            this.showError('An error occurred. Please try again.');
        }
    }
    
    quickView(gearId) {
        const item = this.gear.find(g => g.id === gearId);
        if (!item) return;
        
        const modal = document.getElementById('quickViewModal');
        const title = document.getElementById('quickViewTitle');
        const content = document.getElementById('quickViewContent');
        
        title.textContent = `${item.brand} ${item.model}`;
        content.innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-images">
                    ${item.photos && item.photos[0] 
                        ? `<img src="${item.photos[0]}" alt="${item.brand} ${item.model}">`
                        : `<div class="no-image">${this.getCategoryIcon(item.category)}</div>`
                    }
                </div>
                <div class="quick-view-details">
                    <p class="category">${item.category}</p>
                    <p class="size-color">${[item.size, item.color].filter(Boolean).join(' • ')}</p>
                    <div class="rating">${'★'.repeat(item.rating || 0)}${'☆'.repeat(5 - (item.rating || 0))}</div>
                    ${item.review ? `<p class="review">${item.review}</p>` : ''}
                    <div class="stats">
                        <div class="stat">
                            <span>Purchased</span>
                            <strong>${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'Unknown'}</strong>
                        </div>
                        <div class="stat">
                            <span>Price</span>
                            <strong>$${item.price || 0}</strong>
                        </div>
                        <div class="stat">
                            <span>Used</span>
                            <strong>${item.usageCount || 0} times</strong>
                        </div>
                        <div class="stat">
                            <span>Cost per use</span>
                            <strong>$${item.usageCount > 0 ? (item.price / item.usageCount).toFixed(2) : '-'}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    }
    
    closeQuickView() {
        document.getElementById('quickViewModal').classList.remove('active');
    }
    
    async toggleFavorite(gearId) {
        try {
            const response = await fetch(`http://localhost:8081/api/user/gear/${gearId}/favorite`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.loadGear();
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }
    
    async logUsage(gearId) {
        try {
            const response = await fetch(`http://localhost:8081/api/user/gear/${gearId}/usage`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showSuccess('Usage logged!');
                this.loadGear();
            }
        } catch (error) {
            console.error('Error logging usage:', error);
        }
    }
    
    showSuccess(message) {
        console.log('Success:', message);
        // TODO: Implement toast notification
    }
    
    showError(message) {
        console.error('Error:', message);
        // TODO: Implement toast notification
    }
}

// Initialize app
const gearApp = new GearCollectionApp();
window.gearApp = gearApp;