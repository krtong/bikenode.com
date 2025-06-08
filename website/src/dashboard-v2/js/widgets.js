// Dashboard V2 - Widgets Module

class WidgetManager {
  constructor() {
    this.widgets = new Map();
    this.refreshIntervals = new Map();
    this.init();
  }

  init() {
    this.registerWidgets();
    this.setupWidgetInteractions();
    this.loadWidgetStates();
  }

  registerWidgets() {
    // Register all dashboard widgets
    const widgetElements = document.querySelectorAll('.widget');
    
    widgetElements.forEach(widget => {
      const widgetId = widget.dataset.widgetId || this.generateWidgetId(widget);
      const widgetType = widget.dataset.widgetType || this.detectWidgetType(widget);
      
      this.widgets.set(widgetId, {
        element: widget,
        type: widgetType,
        state: 'idle',
        lastUpdate: Date.now()
      });

      // Set up refresh if specified
      const refreshRate = widget.dataset.refresh;
      if (refreshRate) {
        this.setupAutoRefresh(widgetId, parseInt(refreshRate) * 1000);
      }
    });
  }

  generateWidgetId(widget) {
    const title = widget.querySelector('.widget-title')?.textContent || 'widget';
    return title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  }

  detectWidgetType(widget) {
    if (widget.classList.contains('recent-activities')) return 'activities';
    if (widget.classList.contains('weekly-progress')) return 'progress';
    if (widget.classList.contains('my-bikes')) return 'bikes';
    if (widget.classList.contains('upcoming-events')) return 'events';
    if (widget.classList.contains('community-activity')) return 'community';
    return 'generic';
  }

  setupWidgetInteractions() {
    this.widgets.forEach((widget, widgetId) => {
      const { element, type } = widget;
      
      // Refresh button
      const refreshBtn = element.querySelector('.widget-action[aria-label="Refresh"]');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.refreshWidget(widgetId);
        });
      }

      // Filter button
      const filterBtn = element.querySelector('.widget-action[aria-label="Filter"]');
      if (filterBtn) {
        filterBtn.addEventListener('click', () => {
          this.showWidgetFilter(widgetId);
        });
      }

      // Widget-specific interactions
      switch (type) {
        case 'activities':
          this.setupActivityInteractions(element);
          break;
        case 'progress':
          this.setupProgressInteractions(element);
          break;
        case 'bikes':
          this.setupBikeInteractions(element);
          break;
        case 'events':
          this.setupEventInteractions(element);
          break;
        case 'community':
          this.setupCommunityInteractions(element);
          break;
      }
    });
  }

  setupActivityInteractions(element) {
    const activityItems = element.querySelectorAll('.activity-item');
    
    activityItems.forEach(item => {
      // Activity options menu
      const actionBtn = item.querySelector('.activity-action');
      if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showActivityOptions(item);
        });
      }

      // Click to view details
      item.addEventListener('click', () => {
        const activityId = item.dataset.activityId;
        if (activityId) {
          window.location.href = `/ride-details/${activityId}`;
        }
      });
    });
  }

  setupProgressInteractions(element) {
    const select = element.querySelector('.widget-select');
    const chart = element.querySelector('.progress-chart');
    
    if (select && chart) {
      select.addEventListener('change', (e) => {
        this.updateProgressChart(chart, e.target.value);
      });
    }

    // Make chart bars interactive
    const bars = element.querySelectorAll('.chart-bar');
    bars.forEach(bar => {
      bar.addEventListener('click', () => {
        const day = bar.querySelector('.chart-label').textContent;
        this.showDayDetails(day);
      });

      // Add hover tooltip
      bar.addEventListener('mouseenter', (e) => {
        const value = bar.style.getPropertyValue('--height');
        this.showTooltip(e.target, `${value} completed`);
      });

      bar.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  setupBikeInteractions(element) {
    const bikeCards = element.querySelectorAll('.bike-card:not(.add-bike)');
    const addBikeBtn = element.querySelector('.bike-card.add-bike');
    
    bikeCards.forEach(card => {
      card.addEventListener('click', () => {
        const bikeName = card.querySelector('.bike-name').textContent;
        window.location.href = `/bike-details/${encodeURIComponent(bikeName)}`;
      });
    });

    if (addBikeBtn) {
      addBikeBtn.addEventListener('click', () => {
        window.location.href = '/add-bike';
      });
    }
  }

  setupEventInteractions(element) {
    const eventItems = element.querySelectorAll('.event-item');
    
    eventItems.forEach(item => {
      item.addEventListener('click', () => {
        const eventTitle = item.querySelector('.event-title').textContent;
        this.showEventDetails(eventTitle);
      });
    });
  }

  setupCommunityInteractions(element) {
    const feedItems = element.querySelectorAll('.feed-item');
    
    feedItems.forEach(item => {
      item.addEventListener('click', () => {
        // Navigate to user profile or activity
        const userName = item.querySelector('strong').textContent;
        console.log('View profile:', userName);
      });
    });
  }

  async refreshWidget(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget || widget.state === 'loading') return;

    const { element, type } = widget;
    
    // Update state
    widget.state = 'loading';
    element.classList.add('loading');

    try {
      // Simulate API call
      const data = await this.fetchWidgetData(type);
      
      // Update widget content
      this.updateWidgetContent(widgetId, data);
      
      // Update last update time
      widget.lastUpdate = Date.now();
      widget.state = 'idle';
      
      // Show success feedback
      this.showRefreshSuccess(element);
      
    } catch (error) {
      widget.state = 'error';
      console.error('Error refreshing widget:', error);
      this.showRefreshError(element);
    } finally {
      element.classList.remove('loading');
    }
  }

  async fetchWidgetData(type) {
    // Simulate API calls based on widget type
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (type) {
      case 'activities':
        return { activities: [] }; // Mock data
      case 'progress':
        return { progress: [] };
      case 'community':
        return { feed: [] };
      default:
        return {};
    }
  }

  updateWidgetContent(widgetId, data) {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    // Update content based on widget type
    console.log('Updating widget:', widgetId, data);
    
    // Add fade effect
    const content = widget.element.querySelector('.widget-content');
    content.style.opacity = '0.5';
    
    setTimeout(() => {
      // Update content here
      content.style.opacity = '1';
    }, 300);
  }

  setupAutoRefresh(widgetId, interval) {
    // Clear existing interval
    if (this.refreshIntervals.has(widgetId)) {
      clearInterval(this.refreshIntervals.get(widgetId));
    }

    // Set new interval
    const intervalId = setInterval(() => {
      this.refreshWidget(widgetId);
    }, interval);

    this.refreshIntervals.set(widgetId, intervalId);
  }

  showWidgetFilter(widgetId) {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    // Create filter modal
    const modal = document.createElement('div');
    modal.className = 'widget-filter-modal';
    modal.innerHTML = `
      <div class="filter-modal-content">
        <h3>Filter Options</h3>
        <div class="filter-options">
          <!-- Filter options based on widget type -->
        </div>
        <div class="filter-actions">
          <button class="btn btn-secondary" onclick="this.closest('.widget-filter-modal').remove()">Cancel</button>
          <button class="btn btn-primary">Apply</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show with animation
    setTimeout(() => modal.classList.add('show'), 10);
  }

  showActivityOptions(activityElement) {
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'activity-context-menu';
    menu.innerHTML = `
      <button class="menu-item">View Details</button>
      <button class="menu-item">Edit Activity</button>
      <button class="menu-item">Share</button>
      <hr>
      <button class="menu-item danger">Delete</button>
    `;
    
    // Position near the action button
    const actionBtn = activityElement.querySelector('.activity-action');
    const rect = actionBtn.getBoundingClientRect();
    
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    
    document.body.appendChild(menu);
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  }

  updateProgressChart(chartElement, metric) {
    console.log('Updating chart to show:', metric);
    
    // Animate bars
    const bars = chartElement.querySelectorAll('.chart-bar');
    bars.forEach((bar, index) => {
      const currentHeight = bar.style.getPropertyValue('--height');
      const newHeight = Math.random() * 100 + '%';
      
      // Animate height change
      bar.style.transition = 'none';
      bar.style.setProperty('--height', '0%');
      
      setTimeout(() => {
        bar.style.transition = 'all 0.5s ease';
        bar.style.setProperty('--height', newHeight);
      }, index * 50);
    });
  }

  showDayDetails(day) {
    console.log('Showing details for:', day);
    // Could open a modal or navigate to detailed view
  }

  showEventDetails(eventTitle) {
    console.log('Showing event:', eventTitle);
    // Could open event details modal
  }

  showTooltip(element, text) {
    // Remove existing tooltip
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'widget-tooltip';
    tooltip.textContent = text;
    tooltip.id = 'widget-tooltip';
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
    tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
  }

  hideTooltip() {
    const tooltip = document.getElementById('widget-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
  }

  showRefreshSuccess(element) {
    const header = element.querySelector('.widget-header');
    const indicator = document.createElement('span');
    indicator.className = 'refresh-indicator success';
    indicator.innerHTML = '✓ Updated';
    
    header.appendChild(indicator);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 2000);
  }

  showRefreshError(element) {
    const header = element.querySelector('.widget-header');
    const indicator = document.createElement('span');
    indicator.className = 'refresh-indicator error';
    indicator.innerHTML = '✕ Error';
    
    header.appendChild(indicator);
    
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 2000);
  }

  loadWidgetStates() {
    // Load collapsed/expanded states from localStorage
    const savedStates = localStorage.getItem('widgetStates');
    if (savedStates) {
      try {
        const states = JSON.parse(savedStates);
        // Apply saved states
      } catch (e) {
        console.error('Error loading widget states:', e);
      }
    }
  }

  saveWidgetStates() {
    const states = {};
    this.widgets.forEach((widget, id) => {
      states[id] = {
        collapsed: widget.element.classList.contains('collapsed')
      };
    });
    
    localStorage.setItem('widgetStates', JSON.stringify(states));
  }

  // Clean up intervals when page unloads
  destroy() {
    this.refreshIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
  }
}

// Add widget-specific styles
const style = document.createElement('style');
style.textContent = `
  .widget-tooltip {
    position: absolute;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-primary);
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    font-size: 0.875rem;
    color: var(--color-text-primary);
    box-shadow: var(--shadow-md);
    z-index: 1000;
    pointer-events: none;
  }

  .refresh-indicator {
    font-size: 0.875rem;
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-full);
    font-weight: 500;
    transition: opacity 0.3s ease;
  }

  .refresh-indicator.success {
    background: var(--color-success);
    color: white;
  }

  .refresh-indicator.error {
    background: var(--color-error);
    color: white;
  }

  .activity-context-menu {
    position: absolute;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: 0.5rem;
    min-width: 150px;
    z-index: 1000;
  }

  .activity-context-menu .menu-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    text-align: left;
    font-size: 0.875rem;
    color: var(--color-text-primary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition-base);
  }

  .activity-context-menu .menu-item:hover {
    background: var(--color-bg-tertiary);
  }

  .activity-context-menu .menu-item.danger {
    color: var(--color-error);
  }

  .activity-context-menu hr {
    margin: 0.5rem 0;
    border: none;
    border-top: 1px solid var(--color-border-primary);
  }

  .widget-filter-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity var(--transition-base);
    z-index: 1000;
  }

  .widget-filter-modal.show {
    opacity: 1;
  }

  .filter-modal-content {
    background: var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: var(--shadow-xl);
  }

  .filter-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
`;
document.head.appendChild(style);

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  window.widgetManager = new WidgetManager();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (window.widgetManager) {
    window.widgetManager.destroy();
  }
});

export default WidgetManager;