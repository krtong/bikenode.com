// Marketplace Craigslist-style JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // State management
    const state = {
        currentCategory: 'all',
        currentView: 'list',
        filters: {
            search: '',
            minPrice: null,
            maxPrice: null,
            location: '',
            dateRange: '',
            sortBy: 'date'
        },
        listings: [] // Will be populated from backend
    };

    // DOM Elements
    const elements = {
        postListingBtn: document.getElementById('postListingBtn'),
        postListingModal: document.getElementById('postListingModal'),
        closeModal: document.getElementById('closeModal'),
        categoryLinks: document.querySelectorAll('.category-link'),
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.querySelector('.btn-search'),
        sortSelect: document.getElementById('sortBy'),
        viewToggles: document.querySelectorAll('.view-toggle'),
        listingsContainer: document.getElementById('listingsContainer'),
        locationFilter: document.getElementById('locationFilter'),
        minPrice: document.getElementById('minPrice'),
        maxPrice: document.getElementById('maxPrice'),
        dateFilter: document.getElementById('dateFilter'),
        applyBtn: document.querySelector('.btn-apply'),
        optionCards: document.querySelectorAll('.option-card')
    };

    // Initialize
    init();

    function init() {
        setupEventListeners();
        loadListings();
        updateActiveCategory();
    }

    // Event Listeners
    function setupEventListeners() {
        // Post listing button
        elements.postListingBtn?.addEventListener('click', openPostModal);
        
        // Modal controls
        elements.closeModal?.addEventListener('click', closePostModal);
        elements.postListingModal?.addEventListener('click', function(e) {
            if (e.target === elements.postListingModal) {
                closePostModal();
            }
        });

        // Category navigation
        elements.categoryLinks.forEach(link => {
            link.addEventListener('click', handleCategoryClick);
        });

        // Search
        elements.searchBtn?.addEventListener('click', performSearch);
        elements.searchInput?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Sort
        elements.sortSelect?.addEventListener('change', handleSort);

        // View toggles
        elements.viewToggles.forEach(toggle => {
            toggle.addEventListener('click', handleViewToggle);
        });

        // Filters
        elements.locationFilter?.addEventListener('change', applyFilters);
        elements.dateFilter?.addEventListener('change', applyFilters);
        elements.applyBtn?.addEventListener('click', applyPriceFilter);

        // Listing source options
        elements.optionCards.forEach(card => {
            card.addEventListener('click', handleListingSource);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && elements.postListingModal.style.display !== 'none') {
                closePostModal();
            }
        });
    }

    // Modal Functions
    function openPostModal() {
        elements.postListingModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closePostModal() {
        elements.postListingModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Category Handling
    function handleCategoryClick(e) {
        e.preventDefault();
        const category = e.currentTarget.dataset.category;
        state.currentCategory = category;
        
        // Update active state
        elements.categoryLinks.forEach(link => {
            link.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Filter listings
        filterListings();
    }

    function updateActiveCategory() {
        const activeLink = document.querySelector(`[data-category="${state.currentCategory}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Search Function
    function performSearch() {
        state.filters.search = elements.searchInput.value.toLowerCase();
        filterListings();
    }

    // Sort Function
    function handleSort() {
        state.filters.sortBy = elements.sortSelect.value;
        sortListings();
    }

    // View Toggle
    function handleViewToggle(e) {
        const view = e.currentTarget.dataset.view;
        state.currentView = view;
        
        // Update active state
        elements.viewToggles.forEach(toggle => {
            toggle.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Update container class
        elements.listingsContainer.className = `listings-container ${view}-view`;
    }

    // Filter Functions
    function applyFilters() {
        state.filters.location = elements.locationFilter.value;
        state.filters.dateRange = elements.dateFilter.value;
        filterListings();
    }

    function applyPriceFilter() {
        state.filters.minPrice = elements.minPrice.value ? parseFloat(elements.minPrice.value) : null;
        state.filters.maxPrice = elements.maxPrice.value ? parseFloat(elements.maxPrice.value) : null;
        filterListings();
    }

    // Listing Source Handler
    function handleListingSource(e) {
        const source = e.currentTarget.dataset.source;
        
        switch(source) {
            case 'garage':
                // Redirect to virtual garage with sell mode
                window.location.href = '/virtual-garage?mode=sell';
                break;
            case 'gear':
                // Redirect to gear collection with sell mode
                window.location.href = '/gear-collection?mode=sell';
                break;
            case 'new':
                // Redirect to create new listing page
                window.location.href = '/sell-item';
                break;
        }
    }

    // Load Listings (Mock for now)
    function loadListings() {
        // This would be replaced with an API call
        console.log('Loading listings...');
        
        // Mock data is already in the HTML
        // In production, this would fetch from the backend
        updateListingCounts();
    }

    // Filter Listings
    function filterListings() {
        // This would filter the listings based on current state
        console.log('Filtering listings:', {
            category: state.currentCategory,
            filters: state.filters
        });
        
        // In production, this would:
        // 1. Apply category filter
        // 2. Apply search filter
        // 3. Apply price range filter
        // 4. Apply location filter
        // 5. Apply date range filter
        // 6. Re-render the listings
    }

    // Sort Listings
    function sortListings() {
        console.log('Sorting by:', state.filters.sortBy);
        
        // In production, this would sort the filtered listings
        // based on the selected sort option
    }

    // Update Listing Counts
    function updateListingCounts() {
        // This would update the counts in the category links
        // based on the actual data
    }

    // Helper Functions
    function formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    }

    function formatDate(date) {
        const now = new Date();
        const listingDate = new Date(date);
        const diffMs = now - listingDate;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return listingDate.toLocaleDateString();
        }
    }

    // Public API for integration with other components
    window.MarketplaceAPI = {
        // Create listing from virtual garage
        createListingFromGarage: function(bikeId) {
            console.log('Creating listing from garage bike:', bikeId);
            // This would:
            // 1. Fetch bike details from virtual garage
            // 2. Pre-populate the listing form
            // 3. Navigate to sell-item page
        },
        
        // Create listing from gear collection
        createListingFromGear: function(gearId) {
            console.log('Creating listing from gear item:', gearId);
            // This would:
            // 1. Fetch gear details from gear collection
            // 2. Pre-populate the listing form
            // 3. Navigate to sell-item page
        },
        
        // Refresh listings
        refreshListings: function() {
            loadListings();
        }
    };
});

// Integration with Virtual Garage
// This allows the virtual garage to communicate with the marketplace
window.addEventListener('message', function(event) {
    if (event.data.type === 'CREATE_LISTING') {
        if (event.data.source === 'garage') {
            window.MarketplaceAPI.createListingFromGarage(event.data.itemId);
        } else if (event.data.source === 'gear') {
            window.MarketplaceAPI.createListingFromGear(event.data.itemId);
        }
    }
});