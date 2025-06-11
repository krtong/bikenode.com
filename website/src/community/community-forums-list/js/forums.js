// Forums Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Filter tabs functionality
  const filterTabs = document.querySelectorAll('.filter-tab');
  const categoryItems = document.querySelectorAll('.category-item');
  
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      
      // Update active tab
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Filter categories
      if (filter === 'all') {
        categoryItems.forEach(item => {
          item.style.display = 'grid';
        });
      } else {
        categoryItems.forEach(item => {
          const category = item.dataset.category;
          const shouldShow = 
            (filter === 'bikes' && ['road', 'mountain', 'ebikes', 'gravel'].includes(category)) ||
            (filter === 'tech' && ['maintenance', 'technical', 'workshop'].includes(category)) ||
            (filter === 'rides' && ['routes', 'trails', 'events'].includes(category)) ||
            (filter === 'community' && ['general', 'news', 'marketplace', 'social'].includes(category));
          
          item.style.display = shouldShow ? 'grid' : 'none';
        });
      }
    });
  });
  
  // Search functionality
  const searchInput = document.getElementById('forumSearch');
  const searchDebounce = debounce((searchTerm) => {
    const categories = document.querySelectorAll('.category-item');
    const topics = document.querySelectorAll('.trending-topic');
    
    categories.forEach(category => {
      const title = category.querySelector('.category-title').textContent.toLowerCase();
      const description = category.querySelector('.category-description').textContent.toLowerCase();
      const matches = title.includes(searchTerm) || description.includes(searchTerm);
      
      category.style.display = matches ? 'grid' : 'none';
    });
    
    topics.forEach(topic => {
      const title = topic.querySelector('.topic-title').textContent.toLowerCase();
      const matches = title.includes(searchTerm);
      
      topic.style.display = matches ? 'flex' : 'none';
    });
  }, 300);
  
  searchInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    searchDebounce(searchTerm);
  });
  
  // New topic button
  document.querySelector('.new-topic-btn')?.addEventListener('click', () => {
    // Show new topic modal or navigate to new topic page
    window.location.href = '/forums/new-topic/';
  });
  
  // Advanced search button
  document.querySelector('.advanced-search-btn')?.addEventListener('click', () => {
    window.location.href = '/forums/search/';
  });
  
  // Auto-update online count
  updateOnlineCount();
  setInterval(updateOnlineCount, 30000); // Update every 30 seconds
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
    
    // Ctrl/Cmd + N for new topic
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      document.querySelector('.new-topic-btn')?.click();
    }
  });
});

// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Update online count with random variation
function updateOnlineCount() {
  const onlineElement = document.querySelector('.stat-item.active .stat-value');
  if (onlineElement) {
    const baseCount = 342;
    const variation = Math.floor(Math.random() * 50) - 25; // ±25 variation
    const newCount = Math.max(300, baseCount + variation);
    onlineElement.textContent = newCount;
  }
}

// Load more categories on scroll (for future implementation)
function loadMoreCategories() {
  // Implement infinite scroll or pagination
  console.log('Loading more categories...');
}

// Mark notifications as read when viewing forums
function markNotificationsRead() {
  // API call to mark forum notifications as read
  fetch('/api/notifications/mark-read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'forum'
    })
  });
}

// Initialize tooltips for user avatars
function initializeTooltips() {
  const avatars = document.querySelectorAll('.user-avatar');
  avatars.forEach(avatar => {
    avatar.addEventListener('mouseenter', showUserTooltip);
    avatar.addEventListener('mouseleave', hideUserTooltip);
  });
}

function showUserTooltip(e) {
  // Show user info tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'user-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <strong>User Name</strong>
      <span>Member since 2024</span>
      <span>123 posts</span>
    </div>
  `;
  document.body.appendChild(tooltip);
  
  const rect = e.target.getBoundingClientRect();
  tooltip.style.position = 'absolute';
  tooltip.style.top = `${rect.top - 10}px`;
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
}

function hideUserTooltip() {
  document.querySelectorAll('.user-tooltip').forEach(t => t.remove());
}

// Export functions for use in other modules
export { updateOnlineCount, markNotificationsRead };