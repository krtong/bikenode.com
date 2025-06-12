document.addEventListener('DOMContentLoaded', function() {
    // Category filtering
    const categories = document.querySelectorAll('.gear-my-collection-category');
    const items = document.querySelectorAll('.gear-my-collection-item');
    
    categories.forEach(category => {
        category.addEventListener('click', () => {
            // Update active category
            categories.forEach(c => c.classList.remove('gear-my-collection-category-active'));
            category.classList.add('gear-my-collection-category-active');
            
            // Filter items
            const selectedCategory = category.dataset.category;
            items.forEach(item => {
                if (selectedCategory === 'all' || item.dataset.category === selectedCategory) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // Modal handling
    const modal = document.getElementById('gear-my-collection-add-modal');
    const addBtn = document.getElementById('gear-my-collection-add-gear');
    const closeBtn = document.querySelector('.gear-my-collection-modal-close');
    const overlay = document.querySelector('.gear-my-collection-modal-overlay');
    
    addBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    [closeBtn, overlay].forEach(el => {
        el.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });
    
    // Form submission
    const form = document.getElementById('gear-my-collection-add-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Handle form submission
        console.log('Adding new gear...');
        modal.style.display = 'none';
        form.reset();
    });
    
    // Search functionality
    const searchInput = document.getElementById('gear-my-collection-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        items.forEach(item => {
            const name = item.querySelector('.gear-my-collection-item-name').textContent.toLowerCase();
            const brand = item.querySelector('.gear-my-collection-item-brand').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || brand.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // View toggle
    const viewBtns = document.querySelectorAll('.gear-my-collection-view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('gear-my-collection-view-active'));
            btn.classList.add('gear-my-collection-view-active');
            
            const view = btn.dataset.view;
            const grid = document.getElementById('gear-my-collection-grid');
            
            if (view === 'list') {
                grid.style.gridTemplateColumns = '1fr';
            } else {
                grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            }
        });
    });
});