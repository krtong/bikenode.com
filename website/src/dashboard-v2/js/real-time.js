// Dashboard V2 - Real-time Updates Module

class RealTimeManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.subscriptions = new Map();
    this.eventHandlers = new Map();
    
    this.init();
  }

  init() {
    // Initialize WebSocket connection
    this.connect();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Set up visibility change handling
    this.setupVisibilityHandling();
  }

  connect() {
    // In production, use actual WebSocket URL
    const wsUrl = this.getWebSocketUrl();
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/dashboard`;
  }

  handleOpen(event) {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Send authentication
    this.authenticate();
    
    // Re-subscribe to channels
    this.resubscribe();
    
    // Update UI
    this.updateConnectionStatus('connected');
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'activity':
          this.handleActivityUpdate(data);
          break;
        case 'notification':
          this.handleNotification(data);
          break;
        case 'stats':
          this.handleStatsUpdate(data);
          break;
        case 'community':
          this.handleCommunityUpdate(data);
          break;
        case 'system':
          this.handleSystemMessage(data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
      
      // Trigger custom event handlers
      if (this.eventHandlers.has(data.type)) {
        this.eventHandlers.get(data.type).forEach(handler => {
          handler(data);
        });
      }
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  handleClose(event) {
    console.log('WebSocket disconnected', event.code, event.reason);
    this.updateConnectionStatus('disconnected');
    
    if (!event.wasClean) {
      this.scheduleReconnect();
    }
  }

  handleError(error) {
    console.error('WebSocket error:', error);
    this.updateConnectionStatus('error');
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.showReconnectError();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  authenticate() {
    // Send authentication message
    const authToken = this.getAuthToken();
    if (authToken) {
      this.send({
        type: 'auth',
        token: authToken
      });
    }
  }

  getAuthToken() {
    // Get auth token from localStorage or cookie
    return localStorage.getItem('authToken');
  }

  resubscribe() {
    // Re-subscribe to all channels
    this.subscriptions.forEach((callback, channel) => {
      this.subscribe(channel, callback);
    });
  }

  subscribe(channel, callback) {
    this.subscriptions.set(channel, callback);
    
    if (this.isConnected()) {
      this.send({
        type: 'subscribe',
        channel: channel
      });
    }
  }

  unsubscribe(channel) {
    this.subscriptions.delete(channel);
    
    if (this.isConnected()) {
      this.send({
        type: 'unsubscribe',
        channel: channel
      });
    }
  }

  send(data) {
    if (this.isConnected()) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, queuing message');
      // Could implement message queue here
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  setupEventHandlers() {
    // Register event handlers for different message types
    this.on('activity', this.updateActivityFeed.bind(this));
    this.on('notification', this.showNotification.bind(this));
    this.on('stats', this.updateDashboardStats.bind(this));
    this.on('community', this.updateCommunityFeed.bind(this));
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  handleActivityUpdate(data) {
    console.log('Activity update:', data);
    
    // Update activity widget
    const activityList = document.querySelector('.activity-list');
    if (activityList && data.activity) {
      this.insertNewActivity(activityList, data.activity);
    }
  }

  handleNotification(data) {
    console.log('New notification:', data);
    
    // Update notification badge
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      const currentCount = parseInt(badge.textContent) || 0;
      badge.textContent = currentCount + 1;
    }

    // Add to notification panel
    const notificationList = document.querySelector('.notification-list');
    if (notificationList && data.notification) {
      this.insertNewNotification(notificationList, data.notification);
    }

    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      this.showBrowserNotification(data.notification);
    }
  }

  handleStatsUpdate(data) {
    console.log('Stats update:', data);
    
    // Update stat cards with animation
    if (data.stats) {
      Object.entries(data.stats).forEach(([key, value]) => {
        this.updateStatCard(key, value);
      });
    }
  }

  handleCommunityUpdate(data) {
    console.log('Community update:', data);
    
    // Update community feed
    const communityFeed = document.querySelector('.community-feed');
    if (communityFeed && data.feedItem) {
      this.insertCommunityItem(communityFeed, data.feedItem);
    }
  }

  handleSystemMessage(data) {
    console.log('System message:', data);
    
    // Handle system messages (maintenance, updates, etc.)
    if (data.message) {
      this.showSystemMessage(data.message, data.severity);
    }
  }

  insertNewActivity(container, activity) {
    const activityHtml = `
      <article class="activity-item new-item" data-activity-id="${activity.id}">
        <div class="activity-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 15C6.65685 15 8 13.6569 8 12C8 10.3431 6.65685 9 5 9C3.34315 9 2 10.3431 2 12C2 13.6569 3.34315 15 5 15Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M15 15C16.6569 15 18 13.6569 18 12C18 10.3431 16.6569 9 15 9C13.3431 9 12 10.3431 12 12C12 13.6569 13.3431 15 15 15Z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 12H12M10 6L8 12L12 12L15 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="activity-details">
          <h4 class="activity-title">${activity.title}</h4>
          <div class="activity-meta">
            <span class="activity-date">${this.formatTime(activity.timestamp)}</span>
            <span class="activity-bike">${activity.bike}</span>
          </div>
          <div class="activity-stats">
            <span class="activity-stat">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6H10M8 4L10 6L8 8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${activity.distance} km
            </span>
            <span class="activity-stat">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4" stroke="currentColor"/>
                <path d="M6 3V6L8 8" stroke="currentColor" stroke-linecap="round"/>
              </svg>
              ${activity.duration}
            </span>
            <span class="activity-stat">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 10L5 7L7 9L10 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              ${activity.elevation}m
            </span>
          </div>
        </div>
        <button class="activity-action" aria-label="More options">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3" r="1" fill="currentColor"/>
            <circle cx="8" cy="8" r="1" fill="currentColor"/>
            <circle cx="8" cy="13" r="1" fill="currentColor"/>
          </svg>
        </button>
      </article>
    `;
    
    // Insert at the beginning
    container.insertAdjacentHTML('afterbegin', activityHtml);
    
    // Animate in
    const newItem = container.querySelector('.new-item');
    setTimeout(() => {
      newItem.classList.add('fade-in');
      newItem.classList.remove('new-item');
    }, 10);
    
    // Remove oldest item if too many
    const items = container.querySelectorAll('.activity-item');
    if (items.length > 5) {
      items[items.length - 1].remove();
    }
  }

  insertNewNotification(container, notification) {
    const notificationHtml = `
      <article class="notification-item unread new-item">
        <div class="notification-icon">
          ${this.getNotificationIcon(notification.type)}
        </div>
        <div class="notification-content">
          <h4 class="notification-title">${notification.title}</h4>
          <p class="notification-text">${notification.text}</p>
          <span class="notification-time">Just now</span>
        </div>
      </article>
    `;
    
    container.insertAdjacentHTML('afterbegin', notificationHtml);
    
    // Animate in
    const newItem = container.querySelector('.new-item');
    setTimeout(() => {
      newItem.classList.add('fade-in');
      newItem.classList.remove('new-item');
    }, 10);
  }

  insertCommunityItem(container, item) {
    const feedHtml = `
      <article class="feed-item new-item">
        <img src="${item.avatar}" alt="${item.userName}" class="feed-avatar">
        <div class="feed-content">
          <p class="feed-text"><strong>${item.userName}</strong> ${item.action}</p>
          <span class="feed-time">Just now</span>
        </div>
      </article>
    `;
    
    container.insertAdjacentHTML('afterbegin', feedHtml);
    
    // Animate in
    const newItem = container.querySelector('.new-item');
    setTimeout(() => {
      newItem.classList.add('fade-in');
      newItem.classList.remove('new-item');
    }, 10);
    
    // Remove oldest item if too many
    const items = container.querySelectorAll('.feed-item');
    if (items.length > 5) {
      items[items.length - 1].remove();
    }
  }

  updateStatCard(statType, value) {
    const statCard = document.querySelector(`.stat-card.${statType}`);
    if (!statCard) return;
    
    const valueElement = statCard.querySelector('.stat-value');
    const changeElement = statCard.querySelector('.stat-change');
    
    if (valueElement && value.current !== undefined) {
      // Animate value change
      this.animateValue(valueElement, value.current);
    }
    
    if (changeElement && value.change !== undefined) {
      // Update change indicator
      changeElement.className = 'stat-change';
      changeElement.classList.add(value.change > 0 ? 'positive' : 'negative');
      changeElement.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="${value.change > 0 ? 'M6 9V3M6 3L3 6M6 3L9 6' : 'M6 3V9M6 9L3 6M6 9L9 6'}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        ${Math.abs(value.change)}% from last month
      `;
    }
  }

  animateValue(element, newValue) {
    const currentValue = parseFloat(element.textContent);
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const value = currentValue + (newValue - currentValue) * this.easeOutCubic(progress);
      element.textContent = Math.round(value);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  updateConnectionStatus(status) {
    // Add visual indicator for connection status
    let indicator = document.querySelector('.connection-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'connection-indicator';
      document.body.appendChild(indicator);
    }
    
    indicator.className = `connection-indicator ${status}`;
    
    switch (status) {
      case 'connected':
        indicator.textContent = 'Live';
        setTimeout(() => {
          indicator.classList.add('fade-out');
        }, 3000);
        break;
      case 'disconnected':
        indicator.textContent = 'Reconnecting...';
        break;
      case 'error':
        indicator.textContent = 'Connection Error';
        break;
    }
  }

  showReconnectError() {
    const message = 'Unable to establish real-time connection. Some features may be limited.';
    this.showSystemMessage(message, 'warning');
  }

  showSystemMessage(message, severity = 'info') {
    const banner = document.createElement('div');
    banner.className = `system-banner ${severity}`;
    banner.innerHTML = `
      <div class="system-banner-content">
        <span>${message}</span>
        <button class="system-banner-close" onclick="this.closest('.system-banner').remove()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    
    document.body.insertAdjacentElement('afterbegin', banner);
    
    // Auto-hide after 10 seconds for non-critical messages
    if (severity !== 'error') {
      setTimeout(() => {
        banner.classList.add('fade-out');
        setTimeout(() => banner.remove(), 300);
      }, 10000);
    }
  }

  showBrowserNotification(notification) {
    new Notification(notification.title, {
      body: notification.text,
      icon: '/assets/images/notification-icon.png',
      badge: '/assets/images/notification-badge.png',
      tag: notification.id,
      renotify: true
    });
  }

  getNotificationIcon(type) {
    const icons = {
      achievement: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L10 6L14 7L11 10L12 14L8 12L4 14L5 10L2 7L6 6L8 2Z" stroke="currentColor" stroke-linejoin="round"/></svg>',
      reminder: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor"/><path d="M8 4V8L10 10" stroke="currentColor" stroke-linecap="round"/></svg>',
      message: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 5L8 9L13 5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="4" width="12" height="9" rx="1" stroke="currentColor"/></svg>',
      default: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor"/><path d="M8 11V7M8 5V5.01" stroke="currentColor" stroke-linecap="round"/></svg>'
    };
    
    return icons[type] || icons.default;
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, could pause updates
        console.log('Page hidden, pausing real-time updates');
      } else {
        // Page is visible again
        console.log('Page visible, resuming real-time updates');
        
        // Reconnect if needed
        if (!this.isConnected()) {
          this.connect();
        }
      }
    });
  }

  updateActivityFeed(data) {
    // Custom handler for activity updates
    console.log('Updating activity feed:', data);
  }

  showNotification(data) {
    // Custom handler for notifications
    console.log('Showing notification:', data);
  }

  updateDashboardStats(data) {
    // Custom handler for stats updates
    console.log('Updating dashboard stats:', data);
  }

  updateCommunityFeed(data) {
    // Custom handler for community updates
    console.log('Updating community feed:', data);
  }

  // Clean up when page unloads
  destroy() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Add real-time specific styles
const style = document.createElement('style');
style.textContent = `
  .connection-indicator {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 0.5rem 1rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-full);
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: var(--shadow-md);
    z-index: 1000;
    transition: all var(--transition-base);
  }

  .connection-indicator.connected {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .connection-indicator.disconnected {
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .connection-indicator.error {
    border-color: var(--color-error);
    color: var(--color-error);
  }

  .connection-indicator.fade-out {
    opacity: 0;
    transform: translateY(-10px);
  }

  .system-banner {
    width: 100%;
    padding: 1rem;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all var(--transition-base);
  }

  .system-banner.info {
    background: var(--color-info);
    color: white;
  }

  .system-banner.warning {
    background: var(--color-warning);
    color: white;
  }

  .system-banner.error {
    background: var(--color-error);
    color: white;
  }

  .system-banner-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .system-banner-close {
    background: none;
    border: none;
    color: currentColor;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .new-item {
    opacity: 0;
    transform: translateY(-10px);
  }

  .new-item.fade-in {
    animation: fadeInUp 0.3s ease forwards;
  }

  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Toast Notifications */
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    font-size: 0.875rem;
    font-weight: 500;
    opacity: 0;
    transform: translateY(20px);
    transition: all var(--transition-base);
    z-index: 1000;
  }

  .toast.show {
    opacity: 1;
    transform: translateY(0);
  }

  .toast.toast-success {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .toast.toast-error {
    border-color: var(--color-error);
    color: var(--color-error);
  }
`;
document.head.appendChild(style);

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check for WebSocket support
  if ('WebSocket' in window) {
    window.realTimeManager = new RealTimeManager();
  } else {
    console.warn('WebSocket not supported in this browser');
  }
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (window.realTimeManager) {
    window.realTimeManager.destroy();
  }
});

export default RealTimeManager;