/**
 * Virtual Garage Dashboard - Main Application
 * Uses global components and styling from global-components.css
 */
import { initializeFilters } from './filters.js';
import { initializeSearch } from './search.js';
import { loadBikes, renderBikeCard } from './bikes.js';
import { loadCrashReports, renderCrashReport } from './crash-reports.js';
import { loadMaintenanceTasks, renderMaintenanceTask } from './maintenance.js';

class VirtualGarageApp {
    constructor() {
        this.apiBase = 'http://localhost:8081/api';
        this.currentTab = 'bikes';
        this.userData = null;
        this.bikes = [];
        this.crashReports = [];
        this.maintenanceTasks = [];
        
        this.init();
    }
    
    async init() {
        this.setupTabNavigation();
        this.setupEventListeners();
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
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tabContent === tabName);
        });
        
        this.currentTab = tabName;
        
        // Load data for the selected tab if needed
        if (tabName === 'gear' && this.userGear.length === 0) {
            this.loadUserGear();
        } else if (tabName === 'crash-reports' && this.crashReports.length === 0) {
            this.loadCrashReports();
        }
    }
    
    setupEventListeners() {
        // Add Gear button
        const addGearBtn = document.getElementById('addGearBtn');
        if (addGearBtn) {
            addGearBtn.addEventListener('click', () => this.showAddGearModal());
        }
        
        // Gear photo upload
        const gearPhotoUpload = document.getElementById('gearPhotoUpload');
        const gearPhotoInput = document.getElementById('gearPhotoInput');
        
        if (gearPhotoUpload && gearPhotoInput) {
            gearPhotoUpload.addEventListener('click', () => gearPhotoInput.click());
            gearPhotoInput.addEventListener('change', (e) => this.handleGearPhotos(e.target.files));
        }
        
        // Modal close on background click
        document.querySelectorAll('.BN-Global-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
    
    async loadUserData() {
        try {
            // Load bikes count
            const bikesResp = await fetch('http://localhost:8081/api/user/bikes/count', {
                credentials: 'include'
            });
            if (bikesResp.ok) {
                const data = await bikesResp.json();
                document.getElementById('bikesCount').textContent = data.count || 0;
            }
            
            // Load gear count
            const gearResp = await fetch('http://localhost:8081/api/user/gear/count', {
                credentials: 'include'
            });
            if (gearResp.ok) {
                const data = await gearResp.json();
                document.getElementById('gearCount').textContent = data.count || 0;
            }
            
            // Load crash reports count
            const crashResp = await fetch('http://localhost:8081/api/user/crash-reports/count', {
                credentials: 'include'
            });
            if (crashResp.ok) {
                const data = await crashResp.json();
                document.getElementById('crashCount').textContent = data.count || 0;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    async loadUserGear() {
        try {
            const response = await fetch('http://localhost:8081/api/user/gear', {
                credentials: 'include'
            });
            
            if (response.ok) {
                this.userGear = await response.json();
                this.displayGear();
            }
        } catch (error) {
            console.error('Error loading gear:', error);
        }
    }
    
    displayGear() {
        const gearGrid = document.getElementById('gearGrid');
        if (!gearGrid) return;
        
        if (this.userGear.length === 0) {
            gearGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🛡️</div>
                    <h3>No gear in your vault yet</h3>
                    <p>Start building your gear collection by adding your protective equipment</p>
                    <button class="btn-primary" onclick="app.showAddGearModal()">
                        <span>➕</span> Add Your First Gear
                    </button>
                </div>
            `;
            return;
        }
        
        gearGrid.innerHTML = this.userGear.map(gear => this.createGearCard(gear)).join('');
    }
    
    createGearCard(gear) {
        const conditionClass = gear.condition.toLowerCase().replace(' ', '-');
        const crashTested = gear.crashReports && gear.crashReports.length > 0;
        
        return `
            <div class="gear-card" data-gear-id="${gear.id}">
                <div class="gear-image">
                    ${gear.photos && gear.photos[0] 
                        ? `<img src="${gear.photos[0]}" alt="${gear.brand} ${gear.model}">`
                        : `<div class="no-image">${this.getGearIcon(gear.type)}</div>`
                    }
                    <div class="gear-badge">${gear.type}</div>
                </div>
                <div class="gear-info">
                    <h3 class="gear-name">${gear.model}</h3>
                    <p class="gear-brand">${gear.brand}</p>
                    <div class="gear-details">
                        ${gear.size ? `<span>${gear.size}</span>` : ''}
                        ${gear.certifications.map(cert => `<span>${cert.toUpperCase()}</span>`).join('')}
                    </div>
                    <div class="gear-stats">
                        <div class="stat">
                            <span class="stat-label">Purchased</span>
                            <span class="stat-value purchase-date">${this.formatDate(gear.purchaseDate)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Miles</span>
                            <span class="stat-value miles-worn">${gear.milesWorn || 0}</span>
                        </div>
                    </div>
                    <div class="gear-condition">
                        <span class="condition-badge ${conditionClass}">${gear.condition}</span>
                        ${crashTested ? '<span class="crash-tested">Crash Tested ✓</span>' : ''}
                    </div>
                </div>
                <div class="gear-actions">
                    <button class="action-btn" title="Edit" onclick="app.editGear('${gear.id}')">✏️</button>
                    <button class="action-btn" title="View Details" onclick="app.viewGear('${gear.id}')">👁️</button>
                    <button class="action-btn" title="Add to Crash Report" onclick="app.addToCrashReport('${gear.id}')">📋</button>
                </div>
            </div>
        `;
    }
    
    getGearIcon(type) {
        const icons = {
            helmet: '🪖',
            jacket: '🧥',
            gloves: '🧤',
            pants: '👖',
            boots: '🥾',
            other: '🛡️'
        };
        return icons[type] || '🛡️';
    }
    
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
    
    showAddGearModal() {
        const modal = document.getElementById('addGearModal');
        if (modal) {
            modal.classList.add('active');
        }
    }
    
    closeAddGearModal() {
        const modal = document.getElementById('addGearModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    handleGearPhotos(files) {
        const preview = document.getElementById('gearPhotoPreview');
        if (!preview) return;
        
        preview.innerHTML = '';
        Array.from(files).slice(0, 4).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'photo-preview';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Photo ${index + 1}">
                    <button type="button" class="remove-photo" onclick="app.removeGearPhoto(${index})">×</button>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }
    
    async saveGear() {
        const form = document.getElementById('addGearForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = new FormData(form);
        const gearData = {
            type: formData.get('gearType'),
            brand: formData.get('brand'),
            model: formData.get('model'),
            size: formData.get('size'),
            color: formData.get('color'),
            purchaseDate: formData.get('purchaseDate'),
            purchasePrice: formData.get('purchasePrice'),
            certifications: Array.from(form.querySelectorAll('input[name="certifications"]:checked'))
                .map(input => input.value),
            notes: formData.get('notes')
        };
        
        try {
            const response = await fetch('http://localhost:8081/api/user/gear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(gearData)
            });
            
            if (response.ok) {
                this.showSuccess('Gear added to your vault!');
                this.closeAddGearModal();
                form.reset();
                this.loadUserGear();
                this.loadUserData();
            } else {
                this.showError('Failed to add gear. Please try again.');
            }
        } catch (error) {
            console.error('Error saving gear:', error);
            this.showError('An error occurred. Please try again.');
        }
    }
    
    showCreateCrashReportModal() {
        const modal = document.getElementById('createCrashReportModal');
        if (modal) {
            modal.classList.add('active');
            this.loadBikesForCrashReport();
            this.loadGearForCrashReport();
        }
    }
    
    closeCrashReportModal() {
        const modal = document.getElementById('createCrashReportModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    async loadBikesForCrashReport() {
        try {
            const response = await fetch('http://localhost:8081/api/user/bikes', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const bikes = await response.json();
                const selector = document.getElementById('crashBikeSelector');
                if (selector) {
                    selector.innerHTML = bikes.map(bike => `
                        <label class="bike-selector-item">
                            <input type="radio" name="crashBike" value="${bike.id}" required>
                            <div class="bike-info">
                                <h4>${bike.year} ${bike.brand} ${bike.model}</h4>
                                <p>${bike.mileage || 'Unknown'} miles</p>
                            </div>
                        </label>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading bikes:', error);
        }
    }
    
    async loadGearForCrashReport() {
        try {
            const response = await fetch('http://localhost:8081/api/user/gear', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const gear = await response.json();
                const selector = document.getElementById('crashGearSelector');
                if (selector) {
                    selector.innerHTML = gear.map(item => `
                        <div class="gear-selector-item">
                            <label>
                                <input type="checkbox" name="crashGear" value="${item.id}">
                                <span>${item.brand} ${item.model} (${item.type})</span>
                            </label>
                            <div class="performance-rating">
                                <label>Performance:</label>
                                <select name="gearPerformance_${item.id}">
                                    <option value="">Not rated</option>
                                    <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                                    <option value="4">⭐⭐⭐⭐ Good</option>
                                    <option value="3">⭐⭐⭐ Average</option>
                                    <option value="2">⭐⭐ Poor</option>
                                    <option value="1">⭐ Failed</option>
                                </select>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading gear:', error);
        }
    }
    
    showSuccess(message) {
        // You can implement a toast notification here
        console.log('Success:', message);
    }
    
    showError(message) {
        // You can implement a toast notification here
        console.error('Error:', message);
    }
}

// Initialize app
const app = new VirtualGarageApp();

// Make app methods available globally
window.app = app;