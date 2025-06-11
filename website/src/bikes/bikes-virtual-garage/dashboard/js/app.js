/**
 * Virtual Garage Dashboard - Main Application
 * Uses global components and styling from global-components.css
 */

import { initializeFilters } from './filters.js';
import { initializeSearch } from './search.js';
import { loadBikes, renderBikeCard } from './bikes.js';
import { loadCrashReports } from './crash-reports.js';
import { loadMaintenanceTasks } from './maintenance.js';

class VirtualGarageDashboard {
    constructor() {
        this.apiBase = 'http://localhost:8081/api';
        this.currentTab = 'bikes';
        this.userData = null;
        this.bikes = [];
    }
    
    async init() {
        this.setupTabNavigation();
        await this.loadUserData();
        
        // Initialize modules
        initializeFilters();
        initializeSearch();
    }
    
    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    }
    
    switchTab(tabName) {
        // Update tab buttons using global CSS classes
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tabContent === tabName);
        });
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        switch(tabName) {
            case 'bikes':
                this.loadBikesTab();
                break;
            case 'crash-reports':
                this.loadCrashReportsTab();
                break;
            case 'maintenance':
                this.loadMaintenanceTab();
                break;
        }
    }
    
    async loadUserData() {
        try {
            const response = await fetch(`${this.apiBase}/user/garage`);
            if (response.ok) {
                this.userData = await response.json();
                this.updateStats();
                this.loadBikesTab();
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            this.showMockData();
        }
    }
    
    updateStats() {
        // Update stat cards with user data
        document.getElementById('totalBikes').textContent = this.userData?.bikes?.length || 0;
        document.getElementById('totalMileage').textContent = this.formatMileage(this.userData?.totalMileage || 0);
        document.getElementById('totalGear').textContent = this.userData?.gear?.length || 0;
        document.getElementById('totalValue').textContent = this.formatCurrency(this.userData?.totalValue || 0);
        
        // Update tab badges
        document.getElementById('bikesCount').textContent = this.userData?.bikes?.length || 0;
        document.getElementById('crashCount').textContent = this.userData?.crashReports?.length || 0;
    }
    
    async loadBikesTab() {
        const bikesGrid = document.getElementById('bikesGrid');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        
        // Show loading state
        bikesGrid.classList.add('d-none');
        emptyState.classList.add('d-none');
        loadingState.classList.remove('d-none');
        
        try {
            this.bikes = await loadBikes(this.apiBase);
            
            loadingState.classList.add('d-none');
            
            if (this.bikes.length === 0) {
                emptyState.classList.remove('d-none');
            } else {
                bikesGrid.classList.remove('d-none');
                this.renderBikes();
            }
        } catch (error) {
            console.error('Failed to load bikes:', error);
            loadingState.classList.add('d-none');
            this.showMockBikes();
        }
    }
    
    renderBikes() {
        const bikesGrid = document.getElementById('bikesGrid');
        // Clear existing cards except the add bike card
        const addBikeCard = bikesGrid.querySelector('.add-bike-card');
        bikesGrid.innerHTML = '';
        
        // Render bike cards
        this.bikes.forEach(bike => {
            bikesGrid.insertAdjacentHTML('beforeend', renderBikeCard(bike));
        });
        
        // Re-add the add bike card at the end
        bikesGrid.appendChild(addBikeCard);
    }
    
    async loadCrashReportsTab() {
        try {
            const reports = await loadCrashReports(this.apiBase);
            this.renderCrashReports(reports);
        } catch (error) {
            console.error('Failed to load crash reports:', error);
        }
    }
    
    async loadMaintenanceTab() {
        try {
            const tasks = await loadMaintenanceTasks(this.apiBase);
            this.renderMaintenanceTasks(tasks);
        } catch (error) {
            console.error('Failed to load maintenance tasks:', error);
        }
    }
    
    renderCrashReports(reports) {
        const reportsList = document.getElementById('crashReportsList');
        const emptyState = document.getElementById('crashReportsEmpty');
        
        if (reports.length === 0) {
            reportsList.classList.add('d-none');
            emptyState.classList.remove('d-none');
        } else {
            emptyState.classList.add('d-none');
            reportsList.classList.remove('d-none');
            // Render reports...
        }
    }
    
    renderMaintenanceTasks(tasks) {
        const tasksList = document.getElementById('maintenanceList');
        const emptyState = document.getElementById('maintenanceEmpty');
        
        if (tasks.length === 0) {
            tasksList.classList.add('d-none');
            emptyState.classList.remove('d-none');
        } else {
            emptyState.classList.add('d-none');
            tasksList.classList.remove('d-none');
            // Render tasks...
        }
    }
    
    // Utility methods
    formatMileage(miles) {
        return miles.toLocaleString() + ' mi';
    }
    
    formatCurrency(amount) {
        return '$' + amount.toLocaleString();
    }
    
    // Mock data for development
    showMockData() {
        document.getElementById('totalBikes').textContent = '3';
        document.getElementById('totalMileage').textContent = '15,420 mi';
        document.getElementById('totalGear').textContent = '12';
        document.getElementById('totalValue').textContent = '$45,000';
        document.getElementById('bikesCount').textContent = '3';
        document.getElementById('crashCount').textContent = '2';
        
        this.showMockBikes();
    }
    
    showMockBikes() {
        const mockBikes = [
            {
                id: 1,
                name: 'Street Triple',
                brand: 'Triumph',
                model: 'Street Triple RS',
                year: 2023,
                type: 'Sport',
                mileage: 3200,
                image: '/assets/images/triumph-street-triple.jpg'
            },
            {
                id: 2,
                name: 'Mountain Warrior',
                brand: 'Trek',
                model: 'Fuel EX 9.8',
                year: 2022,
                type: 'Mountain Bike',
                mileage: 450,
                image: '/assets/images/trek-fuel-ex.jpg'
            }
        ];
        
        this.bikes = mockBikes;
        document.getElementById('bikesGrid').classList.remove('d-none');
        this.renderBikes();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new VirtualGarageDashboard();
    app.init();
});

// Export for use in other modules
export { VirtualGarageDashboard };