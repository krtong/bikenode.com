// Gear Page - Display RevZilla gear data
import { fetchGearProducts, fetchGearCategories, fetchGearBrands, createProductCard } from './gear-api.js';

const state = {
    products: [],
    categories: [],
    brands: [],
    currentCategory: 'all',
    filters: {
        category: '',
        search: ''
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    await init();
});

async function init() {
    // Load initial data
    await Promise.all([
        loadCategories(),
        loadProducts()
    ]);
    
    // Set up event listeners
    setupEventListeners();
    
    // Update stats
    updateStats();
}

async function loadCategories() {
    const categories = await fetchGearCategories();
    state.categories = categories;
    updateCategoryButtons();
}

async function loadProducts() {
    const products = await fetchGearProducts(state.filters);
    state.products = products;
    renderProducts();
}

function updateCategoryButtons() {
    const container = document.querySelector('.gear-categories');
    if (!container) return;
    
    // Update counts for existing buttons
    container.querySelectorAll('.category-btn').forEach(btn => {
        const category = btn.dataset.category;
        if (category === 'all') {
            btn.querySelector('.category-count').textContent = state.products.length;
        } else {
            const cat = state.categories.find(c => c.category.includes(category));
            if (cat) {
                btn.querySelector('.category-count').textContent = cat.count;
            }
        }
    });
}

function updateStats() {
    // Total items
    document.getElementById('totalItems').textContent = state.products.length;
    
    // Total value (sum of current prices)
    const totalValue = state.products.reduce((sum, p) => sum + (p.sale_price || p.price), 0);
    document.getElementById('totalValue').textContent = `$${totalValue.toFixed(0)}`;
    
    // Active listings (items on sale)
    const activeListings = state.products.filter(p => p.sale_price).length;
    document.getElementById('activeListings').textContent = activeListings;
    
    // Items due for replacement (placeholder)
    document.getElementById('itemsDue').textContent = '0';
}

function renderProducts() {
    const grid = document.getElementById('gearGrid');
    if (!grid) return;
    
    if (state.products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>No gear found</p>
            </div>
        `;
        return;
    }
    
    // Create simple gear cards for now
    grid.innerHTML = state.products.map(product => {
        const imageUrl = product.images?.[0] || `/assets/images/gear/${product.category.replace('motorcycle-', '')}-1.svg`;
        const price = product.sale_price 
            ? `<span class="original-price">$${product.price.toFixed(2)}</span> <span class="sale-price">$${product.sale_price.toFixed(2)}</span>`
            : `$${product.price.toFixed(2)}`;
        
        return `
            <div class="gear-item" data-category="${product.category}">
                <div class="gear-image">
                    <img src="${imageUrl}" alt="${product.name}">
                    ${product.sale_price ? '<span class="sale-badge">SALE</span>' : ''}
                </div>
                <div class="gear-info">
                    <h3>${product.name}</h3>
                    <p class="brand">${product.brand}</p>
                    <p class="price">${price}</p>
                    ${product.rating ? `<p class="rating">★${product.rating} (${product.review_count} reviews)</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter
            const category = this.dataset.category;
            state.currentCategory = category;
            state.filters.category = category === 'all' ? '' : `motorcycle-${category}`;
            
            // Reload products
            loadProducts();
        });
    });
    
    // Search
    const searchInput = document.getElementById('gearSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.filters.search = this.value;
                loadProducts();
            }, 300);
        });
    }
    
    // Sort
    const sortSelect = document.getElementById('sortGear');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            // For now, just reload (API doesn't support sorting yet)
            loadProducts();
        });
    }
}