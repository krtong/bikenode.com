// Dashboard V2 - Navigation Module

class NavigationManager {
  constructor() {
    this.currentPath = window.location.pathname;
    this.navItems = document.querySelectorAll('.nav-item');
    this.init();
  }

  init() {
    this.highlightCurrentPage();
    this.setupNavigationTracking();
    this.setupBreadcrumbs();
  }

  highlightCurrentPage() {
    this.navItems.forEach(item => {
      const href = item.getAttribute('href');
      
      // Remove any existing active states
      item.classList.remove('active');
      
      // Check if current path matches
      if (href === this.currentPath || 
          (href !== '/' && this.currentPath.startsWith(href))) {
        item.classList.add('active');
        
        // Scroll into view if in collapsed sidebar
        const sidebar = document.getElementById('dashboardSidebar');
        if (sidebar?.classList.contains('collapsed')) {
          item.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    });
  }

  setupNavigationTracking() {
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Track navigation
        this.trackNavigation(item.href, item.querySelector('.nav-text')?.textContent);
        
        // Add loading state
        if (!e.ctrlKey && !e.metaKey) {
          this.showNavigationLoading();
        }
      });
    });
  }

  setupBreadcrumbs() {
    const breadcrumb = document.querySelector('.breadcrumb ol');
    if (!breadcrumb) return;

    // Generate breadcrumb based on current path
    const pathSegments = this.currentPath.split('/').filter(Boolean);
    
    // Clear existing breadcrumbs
    breadcrumb.innerHTML = '<li><a href="/">Home</a></li>';
    
    // Build breadcrumb path
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      const li = document.createElement('li');
      if (isLast) {
        li.setAttribute('aria-current', 'page');
        li.textContent = this.formatSegmentName(segment);
      } else {
        const link = document.createElement('a');
        link.href = currentPath;
        link.textContent = this.formatSegmentName(segment);
        li.appendChild(link);
      }
      
      breadcrumb.appendChild(li);
    });
  }

  formatSegmentName(segment) {
    // Convert URL segment to readable name
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  trackNavigation(url, label) {
    // Analytics tracking
    if (window.gtag) {
      window.gtag('event', 'navigation', {
        event_category: 'Dashboard',
        event_label: label,
        value: url
      });
    }
  }

  showNavigationLoading() {
    // Add loading indicator
    const loader = document.createElement('div');
    loader.className = 'navigation-loader';
    loader.innerHTML = `
      <div class="loader-bar"></div>
    `;
    document.body.appendChild(loader);
    
    // Remove on page unload
    window.addEventListener('beforeunload', () => {
      loader.remove();
    });
  }

  // Navigate programmatically
  navigateTo(path, options = {}) {
    if (options.newTab) {
      window.open(path, '_blank');
    } else if (options.replace) {
      window.location.replace(path);
    } else {
      window.location.href = path;
    }
  }

  // Get active navigation item
  getActiveNavItem() {
    return document.querySelector('.nav-item.active');
  }

  // Update navigation badge
  updateNavBadge(navItemSelector, count) {
    const navItem = document.querySelector(navItemSelector);
    if (!navItem) return;

    let badge = navItem.querySelector('.nav-badge');
    
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        navItem.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
    } else if (badge) {
      badge.remove();
    }
  }

  // Show/hide navigation indicator
  setNavIndicator(navItemSelector, show = true) {
    const navItem = document.querySelector(navItemSelector);
    if (!navItem) return;

    let indicator = navItem.querySelector('.nav-indicator');
    
    if (show) {
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'nav-indicator';
        navItem.appendChild(indicator);
      }
    } else if (indicator) {
      indicator.remove();
    }
  }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.navigationManager = new NavigationManager();
});

// Add loading bar styles
const style = document.createElement('style');
style.textContent = `
  .navigation-loader {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    z-index: 9999;
    overflow: hidden;
  }

  .loader-bar {
    height: 100%;
    background: var(--color-accent-primary);
    animation: loading-progress 1s ease-out;
    transform-origin: left;
  }

  @keyframes loading-progress {
    0% {
      transform: scaleX(0);
    }
    50% {
      transform: scaleX(0.5);
    }
    100% {
      transform: scaleX(0.8);
    }
  }

  .nav-item.search-highlight {
    background: var(--color-warning) !important;
    color: var(--color-text-primary) !important;
  }
`;
document.head.appendChild(style);

export default NavigationManager;