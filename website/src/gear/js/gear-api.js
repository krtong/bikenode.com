// Gear API module for fetching motorcycle gear data

const API_BASE = 'http://localhost:8080/api';

export async function fetchGearProducts(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.search) params.append('search', filters.search);
    if (filters.minPrice) params.append('min_price', filters.minPrice);
    if (filters.maxPrice) params.append('max_price', filters.maxPrice);
    if (filters.minRating) params.append('min_rating', filters.minRating);
    if (filters.limit) params.append('limit', filters.limit);
    
    try {
        const response = await fetch(`${API_BASE}/gear/products?${params}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        return await response.json();
    } catch (error) {
        console.error('Error fetching gear products:', error);
        return [];
    }
}

export async function fetchGearCategories() {
    try {
        const response = await fetch(`${API_BASE}/gear/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        return await response.json();
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

export async function fetchGearBrands() {
    try {
        const response = await fetch(`${API_BASE}/gear/brands`);
        if (!response.ok) throw new Error('Failed to fetch brands');
        return await response.json();
    } catch (error) {
        console.error('Error fetching brands:', error);
        return [];
    }
}

export function formatPrice(price, salePrice) {
    if (salePrice) {
        return `<span class="original-price">$${price.toFixed(2)}</span> <span class="sale-price">$${salePrice.toFixed(2)}</span>`;
    }
    return `$${price.toFixed(2)}`;
}

export function formatRating(rating, reviewCount) {
    if (!rating) return '';
    
    const stars = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
    return `<span class="rating">${stars} ${rating.toFixed(1)} (${reviewCount || 0} reviews)</span>`;
}

export function createProductCard(product) {
    const imageUrl = product.local_image_path || product.images?.[0] || `/assets/images/gear/${product.category.replace('motorcycle-', '')}-placeholder.svg`;
    
    return `
        <div class="gear-item" data-category="${product.category}" data-brand="${product.brand}">
            <div class="gear-item-badge">
                ${product.sale_price ? '<span class="badge-sale">SALE</span>' : ''}
                ${product.rating >= 4.5 ? '<span class="badge-top-rated">TOP RATED</span>' : ''}
            </div>
            <div class="gear-item-image">
                <img src="${imageUrl}" alt="${product.name}">
            </div>
            <div class="gear-item-info">
                <div class="gear-item-brand">${product.brand}</div>
                <h3 class="gear-item-name">${product.name}</h3>
                <div class="gear-item-rating">
                    ${formatRating(product.rating, product.review_count)}
                </div>
                <div class="gear-item-price">
                    ${formatPrice(product.price, product.sale_price)}
                </div>
                <div class="gear-item-features">
                    ${product.features ? product.features.slice(0, 2).map(f => `<span class="feature-tag">${f}</span>`).join('') : ''}
                </div>
                <button class="btn-view-details" onclick="viewProductDetails('${product.id}')">
                    View Details
                </button>
            </div>
        </div>
    `;
}

// Make viewProductDetails available globally
window.viewProductDetails = function(productId) {
    // For now, just log
    console.log('View details for product:', productId);
    // TODO: Implement product detail modal or navigation
};