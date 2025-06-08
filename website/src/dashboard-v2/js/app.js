// Dashboard V2 - Main Application JavaScript

class DashboardApp {
  constructor() {
    this.state = {
      sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
      notifications: [],
      recentActivities: [],
      userPreferences: {}
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeComponents();
    this.loadUserData();
  }

  setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('dashboardSidebar');
    
    mobileMenuToggle?.addEventListener('click', () => {
      mobileMenuToggle.classList.toggle('active');
      sidebar.classList.toggle('active');
      
      // Close sidebar when clicking outside on mobile
      if (sidebar.classList.contains('active')) {
        document.addEventListener('click', this.handleOutsideClick);
      } else {
        document.removeEventListener('click', this.handleOutsideClick);
      }
    });

    // Sidebar collapse
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    sidebarCollapse?.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      this.state.sidebarCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', this.state.sidebarCollapsed);
      
      // Trigger resize event for charts
      window.dispatchEvent(new Event('resize'));
    });

    // Apply saved sidebar state
    if (this.state.sidebarCollapsed && window.innerWidth > 768) {
      sidebar?.classList.add('collapsed');
    }


    // User menu toggle
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userMenu = document.getElementById('userMenu');
    
    userMenuToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenuToggle.classList.toggle('active');
      userMenu.classList.toggle('active');
    });

    // Notification toggle
    const notificationToggle = document.getElementById('notificationToggle');
    const notificationPanel = document.getElementById('notificationPanel');
    const notificationClose = document.getElementById('notificationClose');

    notificationToggle?.addEventListener('click', () => {
      notificationPanel.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    notificationClose?.addEventListener('click', () => {
      notificationPanel.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Quick add menu
    const quickAddToggle = document.getElementById('quickAddToggle');
    const quickAddMenu = document.getElementById('quickAddMenu');

    quickAddToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      quickAddMenu.classList.toggle('active');
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      // Close user menu
      if (!e.target.closest('.sidebar-user')) {
        userMenuToggle?.classList.remove('active');
        userMenu?.classList.remove('active');
      }

      // Close quick add menu
      if (!e.target.closest('.quick-add-dropdown')) {
        quickAddMenu?.classList.remove('active');
      }
    });

    // Search functionality
    const searchInput = document.getElementById('dashboardSearch');
    searchInput?.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput?.focus();
      }

      // Escape to close panels
      if (e.key === 'Escape') {
        notificationPanel?.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Window resize handling
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.handleResize();
      }, 250);
    });
  }

  handleOutsideClick = (e) => {
    const sidebar = document.getElementById('dashboardSidebar');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
      sidebar.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  handleResize() {
    const sidebar = document.getElementById('dashboardSidebar');
    
    // Auto-hide sidebar on mobile
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      document.getElementById('mobileMenuToggle').classList.remove('active');
    }
  }

  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      this.clearSearchHighlights();
      return;
    }

    // Search through navigation items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        item.classList.add('search-highlight');
      } else {
        item.classList.remove('search-highlight');
      }
    });

    // You can extend this to search through other content
    console.log('Searching for:', searchTerm);
  }

  clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight');
    });
  }

  initializeComponents() {
    // Initialize tooltips
    this.initTooltips();

    // Initialize charts
    this.initCharts();

    // Initialize activity feed
    this.initActivityFeed();

    // Initialize lazy loading for images
    this.initLazyLoading();
  }

  initTooltips() {
    // Simple tooltip implementation
    const elements = document.querySelectorAll('[data-tooltip]');
    elements.forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = e.target.dataset.tooltip;
        
        document.body.appendChild(tooltip);
        
        const rect = e.target.getBoundingClientRect();
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
        tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
        
        e.target._tooltip = tooltip;
      });

      el.addEventListener('mouseleave', (e) => {
        if (e.target._tooltip) {
          e.target._tooltip.remove();
          delete e.target._tooltip;
        }
      });
    });
  }

  initCharts() {
    // Initialize weekly progress chart
    const chartContainer = document.getElementById('weeklyProgressChart');
    if (chartContainer) {
      // In a real implementation, you would use a charting library like Chart.js
      console.log('Initializing charts...');
    }
  }

  initActivityFeed() {
    // Simulate real-time activity updates
    this.updateActivityFeed();
    
    // Update every 30 seconds
    setInterval(() => {
      this.updateActivityFeed();
    }, 30000);
  }

  initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        });
      });

      const lazyImages = document.querySelectorAll('img.lazy');
      lazyImages.forEach(img => imageObserver.observe(img));
    }
  }

  async loadUserData() {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update UI with loaded data
      this.updateStats();
      this.updateNotifications();
      
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showError('Failed to load dashboard data');
    }
  }

  updateStats() {
    // Animate stat values
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(stat => {
      const finalValue = stat.textContent;
      stat.style.opacity = '0';
      
      setTimeout(() => {
        stat.style.opacity = '1';
        stat.style.transition = 'opacity 0.5s ease';
      }, 100);
    });
  }

  updateNotifications() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      // Simulate unread count
      const unreadCount = Math.floor(Math.random() * 5) + 1;
      badge.textContent = unreadCount;
    }
  }

  updateActivityFeed() {
    const feedContainer = document.querySelector('.community-feed');
    if (!feedContainer) return;

    // Add subtle animation to new items
    const feedItems = feedContainer.querySelectorAll('.feed-item');
    feedItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
          item.style.transition = 'all 0.3s ease';
        }, 50);
      }, index * 100);
    });
  }

  showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DashboardApp();
});

// Export for use in other modules
export default DashboardApp;