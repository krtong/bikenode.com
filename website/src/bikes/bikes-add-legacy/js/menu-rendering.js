// Menu rendering utilities
export function createMenuOption(item, onClick) {
    const option = document.createElement('div');
    option.className = 'menu-option';
    
    // Check if item has a favicon path
    let iconContent = '';
    if (item.favicon) {
        iconContent = `<img src="${item.favicon}" alt="${item.title} favicon" class="brand-favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                      <div class="fallback-icon" style="display:none;">${item.icon || '🏍️'}</div>`;
    } else {
        iconContent = item.icon || '';
    }
    
    option.innerHTML = `
        <div class="option-icon">${iconContent}</div>
        <div class="option-content">
            <div class="option-title">${item.title}</div>
            <div class="option-description">${item.description}</div>
        </div>
        <div class="option-arrow">→</div>
    `;
    
    option.addEventListener('mouseenter', () => {
        if (item.preview) {
            import('./navigation.js').then(({ updateDisplay }) => {
                updateDisplay(item.preview.icon, item.preview.name, item.preview.desc, true);
            });
        }
    });
    
    option.addEventListener('mouseleave', () => {
        import('./navigation.js').then(({ resetDisplay }) => {
            resetDisplay();
        });
    });
    
    option.addEventListener('click', async (e) => {
        // Add loading class to the clicked option
        option.classList.add('loading');
        
        // Disable all other options while loading
        const allOptions = document.querySelectorAll('.menu-option');
        allOptions.forEach(opt => {
            if (opt !== option) {
                opt.style.opacity = '0.5';
                opt.style.pointerEvents = 'none';
            }
        });
        
        try {
            await onClick();
            // Remove loading state after action completes
            option.classList.remove('loading');
            allOptions.forEach(opt => {
                opt.style.opacity = '';
                opt.style.pointerEvents = '';
            });
        } catch (error) {
            console.error('Error during menu action:', error);
            // Remove loading state on error
            option.classList.remove('loading');
            allOptions.forEach(opt => {
                opt.style.opacity = '';
                opt.style.pointerEvents = '';
            });
        }
    });
    
    return option;
}

export function renderItemsWithSearch(items, onItemClick, searchPlaceholder = 'Search...', showLetters = false) {
    const content = document.getElementById('menu-content');
    content.innerHTML = '';
    
    // Add search bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" class="search-input" placeholder="${searchPlaceholder}" id="menu-search-input">
    `;
    content.appendChild(searchContainer);
    
    // Container for filtered items
    const itemsContainer = document.createElement('div');
    itemsContainer.id = 'filtered-items-container';
    content.appendChild(itemsContainer);
    
    // Function to render filtered items
    function renderFilteredItems(searchTerm = '') {
        itemsContainer.innerHTML = '';
        
        // Filter items based on search
        let filteredItems = items;
        if (searchTerm) {
            filteredItems = items.filter(item => 
                item.title.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (filteredItems.length === 0) {
            itemsContainer.innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No results found</div>';
            return;
        }
        
        // Group items by first letter if showLetters is true
        if (showLetters) {
            const grouped = {};
            filteredItems.forEach(item => {
                const firstLetter = item.title[0].toUpperCase();
                if (!grouped[firstLetter]) {
                    grouped[firstLetter] = [];
                }
                grouped[firstLetter].push(item);
            });
            
            // Render grouped items
            Object.keys(grouped).sort().forEach(letter => {
                // Add letter separator
                const separator = document.createElement('div');
                separator.className = 'letter-separator';
                separator.textContent = letter;
                itemsContainer.appendChild(separator);
                
                // Add items for this letter
                grouped[letter].forEach(item => {
                    const option = createMenuOption(item, () => onItemClick(item));
                    itemsContainer.appendChild(option);
                });
            });
        } else {
            // Render items without grouping
            filteredItems.forEach(item => {
                const option = createMenuOption(item, () => onItemClick(item));
                itemsContainer.appendChild(option);
            });
        }
    }
    
    // Initial render
    renderFilteredItems();
    
    // Add search functionality
    const searchInput = document.getElementById('menu-search-input');
    searchInput.addEventListener('input', (e) => {
        renderFilteredItems(e.target.value);
    });
    
    // Focus search input
    setTimeout(() => searchInput.focus(), 100);
}

export function renderItemsWithCategoryGrouping(items, onItemClick, searchPlaceholder = 'Search...') {
    const content = document.getElementById('menu-content');
    content.innerHTML = '';
    
    // Add search bar
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" class="search-input" placeholder="${searchPlaceholder}" id="menu-search-input">
    `;
    content.appendChild(searchContainer);
    
    // Container for filtered items
    const itemsContainer = document.createElement('div');
    itemsContainer.id = 'filtered-items-container';
    content.appendChild(itemsContainer);
    
    // Function to render filtered items grouped by category
    function renderFilteredItems(searchTerm = '') {
        itemsContainer.innerHTML = '';
        
        // Filter items based on search
        let filteredItems = items;
        if (searchTerm) {
            filteredItems = items.filter(item => 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        
        if (filteredItems.length === 0) {
            itemsContainer.innerHTML = '<div class="menu-option" style="opacity: 0.5; cursor: default;">No results found</div>';
            return;
        }
        
        // Group items by category
        const grouped = {};
        filteredItems.forEach(item => {
            const category = item.category || 'Unspecified category';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });
        
        // Sort categories and render them
        const sortedCategories = Object.keys(grouped).sort();
        
        sortedCategories.forEach(category => {
            // Add category separator
            const separator = document.createElement('div');
            separator.className = 'letter-separator';
            separator.textContent = category;
            itemsContainer.appendChild(separator);
            
            // Sort models within category alphabetically
            const sortedModels = grouped[category].sort((a, b) => a.title.localeCompare(b.title));
            
            // Add items for this category
            sortedModels.forEach(item => {
                const option = createMenuOption(item, () => onItemClick(item));
                itemsContainer.appendChild(option);
            });
        });
    }
    
    // Initial render
    renderFilteredItems();
    
    // Add search functionality
    const searchInput = document.getElementById('menu-search-input');
    searchInput.addEventListener('input', (e) => {
        renderFilteredItems(e.target.value);
    });
    
    // Focus search input
    setTimeout(() => searchInput.focus(), 100);
}