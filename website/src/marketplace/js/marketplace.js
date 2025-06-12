// Marketplace functionality
export class MarketplaceManager {
    constructor() {
        this.filters = {
            condition: '',
            location: '',
            minPrice: null,
            maxPrice: null,
            brand: '',
            yearFrom: null,
            yearTo: null,
            seller: ''
        };
        this.currentView = 'grid';
        this.currentSort = 'recent';
        this.currentPage = 1;
        this.itemsPerPage = 20;
    }

    init() {
        this.setupEventListeners();
        this.loadListings();
    }

    setupEventListeners() {
        // Toggle extended filters
        const moreFiltersBtn = document.getElementById('moreFiltersBtn');
        if (moreFiltersBtn) {
            moreFiltersBtn.addEventListener('click', () => this.toggleExtendedFilters());
        }

        // View toggle
        const viewToggles = document.querySelectorAll('.view-toggle');
        viewToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => this.handleViewToggle(e));
        });

        // Favorite toggle
        this.setupFavoriteButtons();

        // Search form
        const searchForm = document.getElementById('marketplaceSearch');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Sort change
        const sortSelect = document.getElementById('sortBy');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSortChange(e));
        }

        // Pagination
        this.setupPagination();
    }

    toggleExtendedFilters() {
        const extendedFilters = document.getElementById('extendedFilters');
        const moreFiltersBtn = document.getElementById('moreFiltersBtn');
        
        if (extendedFilters) {
            const isVisible = extendedFilters.style.display !== 'none';
            extendedFilters.style.display = isVisible ? 'none' : 'block';
            moreFiltersBtn.textContent = isVisible ? 'More Filters' : 'Less Filters';
        }
    }

    handleViewToggle(event) {
        const viewToggles = document.querySelectorAll('.view-toggle');
        viewToggles.forEach(t => t.classList.remove('active'));
        event.currentTarget.classList.add('active');
        
        this.currentView = event.currentTarget.dataset.view;
        const grid = document.getElementById('listingsGrid');
        
        if (this.currentView === 'list') {
            grid.style.gridTemplateColumns = '1fr';
            grid.classList.add('list-view');
        } else {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            grid.classList.remove('list-view');
        }
    }

    setupFavoriteButtons() {
        // Use event delegation for dynamically loaded content
        const listingsGrid = document.getElementById('listingsGrid');
        if (listingsGrid) {
            listingsGrid.addEventListener('click', (e) => {
                const favoriteBtn = e.target.closest('.favorite-btn');
                if (favoriteBtn) {
                    this.toggleFavorite(favoriteBtn);
                }
            });
        }
    }

    toggleFavorite(button) {
        button.classList.toggle('favorited');
        
        const svg = button.querySelector('svg');
        if (button.classList.contains('favorited')) {
            svg.setAttribute('fill', 'currentColor');
            // Save to favorites (would make API call here)
            this.saveToFavorites(button.closest('.listing-card').dataset.listingId);
        } else {
            svg.setAttribute('fill', 'none');
            // Remove from favorites (would make API call here)
            this.removeFromFavorites(button.closest('.listing-card').dataset.listingId);
        }
    }

    async handleSearch(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        
        // Update filters from form data
        this.filters = {
            q: formData.get('q'),
            condition: formData.get('condition'),
            location: formData.get('location'),
            minPrice: formData.get('minPrice'),
            maxPrice: formData.get('maxPrice'),
            brand: formData.get('brand'),
            yearFrom: formData.get('yearFrom'),
            yearTo: formData.get('yearTo'),
            seller: formData.get('seller')
        };
        
        // Reset to page 1 when searching
        this.currentPage = 1;
        
        await this.loadListings();
    }

    handleSortChange(event) {
        this.currentSort = event.target.value;
        this.loadListings();
    }

    setupPagination() {
        const paginationContainer = document.querySelector('.pagination');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', (e) => {
                if (e.target.closest('.pagination-prev')) {
                    this.goToPage(this.currentPage - 1);
                } else if (e.target.closest('.pagination-next')) {
                    this.goToPage(this.currentPage + 1);
                } else if (e.target.classList.contains('pagination-number')) {
                    this.goToPage(parseInt(e.target.textContent));
                }
            });
        }
    }

    goToPage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadListings();
    }

    async loadListings() {
        try {
            // Show loading state
            this.showLoadingState();
            
            // Build query parameters
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.currentSort,
                ...this.filters
            });
            
            // Fetch listings from API
            const response = await fetch(`/api/marketplace/listings?${params}`);
            const data = await response.json();
            
            // Update UI
            this.renderListings(data.listings);
            this.updateResultsInfo(data.total, data.page, data.limit);
            this.updatePagination(data.page, data.totalPages);
            
        } catch (error) {
            console.error('Error loading listings:', error);
            this.showErrorState();
        }
    }

    showLoadingState() {
        const grid = document.getElementById('listingsGrid');
        if (grid) {
            grid.innerHTML = '<div class="loading-state">Loading listings...</div>';
        }
    }

    showErrorState() {
        const grid = document.getElementById('listingsGrid');
        if (grid) {
            grid.innerHTML = '<div class="error-state">Error loading listings. Please try again.</div>';
        }
    }

    renderListings(listings) {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;
        
        grid.innerHTML = listings.map(listing => this.createListingCard(listing)).join('');
    }

    createListingCard(listing) {
        return `
            <div class="listing-card" data-listing-id="${listing.id}">
                ${listing.isNew ? '<div class="listing-badge new">New Listing</div>' : ''}
                <div class="listing-image">
                    <img src="${listing.image || '/assets/images/placeholder-bike.jpg'}" alt="${listing.title}">
                    <button class="favorite-btn ${listing.isFavorited ? 'favorited' : ''}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="${listing.isFavorited ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                </div>
                <div class="listing-details">
                    <h3>${listing.title}</h3>
                    <div class="listing-price">$${listing.price.toLocaleString()}</div>
                    <div class="listing-info">
                        <span>${listing.mileage ? listing.mileage.toLocaleString() + ' miles' : 'N/A'}</span>
                        <span>•</span>
                        <span>${listing.condition}</span>
                    </div>
                    <div class="listing-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${listing.location}
                    </div>
                    ${listing.seller ? `
                        <div class="listing-seller">
                            ${listing.seller.isVerified ? '<span class="seller-badge verified">Verified</span>' : ''}
                            <span class="seller-name">${listing.seller.name}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updateResultsInfo(total, page, limit) {
        const resultCount = document.querySelector('.result-count');
        if (resultCount) {
            const start = (page - 1) * limit + 1;
            const end = Math.min(page * limit, total);
            resultCount.textContent = `Showing ${start}-${end} of ${total.toLocaleString()} listings`;
        }
    }

    updatePagination(currentPage, totalPages) {
        // Update pagination UI
        // This would be more complex in a real implementation
    }

    async saveToFavorites(listingId) {
        try {
            await fetch(`/api/marketplace/favorites/${listingId}`, { method: 'POST' });
        } catch (error) {
            console.error('Error saving favorite:', error);
        }
    }

    async removeFromFavorites(listingId) {
        try {
            await fetch(`/api/marketplace/favorites/${listingId}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Error removing favorite:', error);
        }
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const marketplace = new MarketplaceManager();
    marketplace.init();
});