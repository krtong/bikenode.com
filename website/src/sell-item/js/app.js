// Sell Item App
class SellItemApp {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.formData = {};
        this.photos = [];
        this.selectedBike = null;
        this.bikeDatabase = {
            motorcycles: [],
            bicycles: []
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupSubcategories();
        this.setupPhotoUpload();
        this.setupTipsToggle();
        this.loadUserBikes();
        this.setupBikeSelection();
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());
        document.getElementById('publishBtn').addEventListener('click', () => this.publishListing());
        document.getElementById('saveDraftBtn').addEventListener('click', () => this.saveDraft());
        
        // Form inputs
        document.getElementById('createListingForm').addEventListener('input', (e) => {
            this.updateFormData(e.target.name, e.target.value);
        });
        
        // Category selection
        document.querySelectorAll('input[name="mainCategory"]').forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateSubcategories();
                this.handleCategoryChange();
            });
        });
        
        // Delivery options
        document.getElementById('shipping').addEventListener('change', (e) => {
            document.getElementById('shippingDetails').style.display = e.target.checked ? 'block' : 'none';
        });
        
        document.getElementById('shippingCost').addEventListener('change', (e) => {
            document.getElementById('flatRateGroup').style.display = 
                e.target.value === 'flat' ? 'block' : 'none';
        });
        
        // Character counter
        document.getElementById('description').addEventListener('input', (e) => {
            document.getElementById('charCount').textContent = e.target.value.length;
        });
        
        // Add specification button
        document.getElementById('addSpecBtn').addEventListener('click', () => this.addSpecification());
        
        // Add modification button
        document.getElementById('addModBtn')?.addEventListener('click', () => this.addModification());
        
        // Condition change handler
        document.getElementById('condition')?.addEventListener('change', (e) => {
            this.updateFormData('condition', e.target.value);
        });
        
        // Modal close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
    }
    
    setupTipsToggle() {
        document.getElementById('toggleTips').addEventListener('click', () => {
            const panel = document.getElementById('tipsPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });
    }
    
    setupSubcategories() {
        const subcategories = {
            motorcycle: ['Sport', 'Cruiser', 'Adventure', 'Touring', 'Dual Sport', 'Scooter', 'Electric'],
            bicycle: ['Road', 'Mountain', 'Hybrid', 'Gravel', 'BMX', 'Electric', 'Folding'],
            parts: ['Engine Parts', 'Brakes', 'Suspension', 'Wheels', 'Electronics', 'Exhaust', 'Other'],
            gear: ['Helmets', 'Jackets', 'Gloves', 'Boots', 'Pants', 'Accessories']
        };
        
        this.subcategories = subcategories;
    }
    
    updateSubcategories() {
        const category = document.querySelector('input[name="mainCategory"]:checked')?.value;
        const subcategorySection = document.getElementById('subcategorySection');
        const subcategorySelect = document.getElementById('subcategorySelect');
        
        if (category && this.subcategories[category]) {
            subcategorySection.style.display = 'block';
            subcategorySelect.innerHTML = '<option value="">Select subcategory...</option>';
            
            this.subcategories[category].forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.toLowerCase().replace(' ', '-');
                option.textContent = sub;
                subcategorySelect.appendChild(option);
            });
        } else {
            subcategorySection.style.display = 'none';
        }
    }
    
    handleCategoryChange() {
        const category = document.querySelector('input[name="mainCategory"]:checked')?.value;
        const bikeSelectionSection = document.getElementById('bikeSelectionSection');
        const vinGroup = document.getElementById('vinGroup');
        const odometerGroup = document.getElementById('odometerGroup');
        
        if (category === 'motorcycle' || category === 'bicycle') {
            bikeSelectionSection.style.display = 'block';
            this.loadBikeBrands(category);
            
            // Show/hide motorcycle-specific fields
            if (vinGroup) vinGroup.style.display = category === 'motorcycle' ? 'block' : 'none';
            if (odometerGroup) {
                const label = odometerGroup.querySelector('.form-label');
                if (label) label.textContent = category === 'motorcycle' ? 'Mileage/Odometer*' : 'Mileage*';
            }
        } else {
            bikeSelectionSection.style.display = 'none';
            if (vinGroup) vinGroup.style.display = 'none';
        }
    }
    
    async loadUserBikes() {
        try {
            const response = await fetch('http://localhost:8081/api/user/bikes', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const bikes = await response.json();
                this.displayOwnedBikes(bikes);
            }
        } catch (error) {
            console.error('Error loading user bikes:', error);
            // Show empty state
            const grid = document.getElementById('ownedBikesGrid');
            if (grid) {
                grid.innerHTML = '<p class="empty-state">No bikes in your garage yet</p>';
            }
        }
    }
    
    displayOwnedBikes(bikes) {
        const grid = document.getElementById('ownedBikesGrid');
        if (!grid) return;
        
        if (!bikes || bikes.length === 0) {
            grid.innerHTML = '<p class="empty-state">No bikes in your garage yet</p>';
            return;
        }
        
        grid.innerHTML = bikes.map(bike => `
            <div class="owned-bike-card" data-bike-id="${bike.id}">
                <div class="bike-image">
                    ${bike.photo ? `<img src="${bike.photo}" alt="${bike.name}">` : '<div class="no-image">🚴</div>'}
                </div>
                <div class="bike-info">
                    <h4>${bike.year} ${bike.brand} ${bike.model}</h4>
                    <p>${bike.mileage ? `${bike.mileage} miles` : 'No mileage recorded'}</p>
                </div>
                <button type="button" class="select-bike-btn" onclick="app.selectOwnedBike('${bike.id}')">
                    Select this bike
                </button>
            </div>
        `).join('');
    }
    
    selectOwnedBike(bikeId) {
        // This would fetch the bike details and populate the form
        console.log('Selected bike:', bikeId);
        // TODO: Implement bike selection logic
        this.showSuccess('Bike selected! Form fields have been populated.');
        
        // Move to next step
        this.nextStep();
    }
    
    setupBikeSelection() {
        const brandSelect = document.getElementById('bikeBrandSelect');
        const yearSelect = document.getElementById('bikeYearSelect');
        const modelSelect = document.getElementById('bikeModelSelect');
        
        if (brandSelect) {
            brandSelect.addEventListener('change', () => this.loadBikeYears());
        }
        
        if (yearSelect) {
            yearSelect.addEventListener('change', () => this.loadBikeModels());
        }
        
        if (modelSelect) {
            modelSelect.addEventListener('change', () => this.handleBikeSelection());
        }
    }
    
    async loadBikeBrands(category) {
        const brandSelect = document.getElementById('bikeBrandSelect');
        if (!brandSelect) return;
        
        brandSelect.innerHTML = '<option value="">Loading brands...</option>';
        
        try {
            let endpoint;
            if (category === 'motorcycle') {
                endpoint = 'http://localhost:8081/api/motorcycles/makes';
            } else {
                endpoint = 'http://localhost:8081/api/bicycles/manufacturers';
            }
            
            const response = await fetch(endpoint);
            if (response.ok) {
                const brands = await response.json();
                brandSelect.innerHTML = '<option value="">Select brand...</option>';
                brands.forEach(brand => {
                    const option = document.createElement('option');
                    option.value = brand;
                    option.textContent = brand;
                    brandSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading brands:', error);
            brandSelect.innerHTML = '<option value="">Error loading brands</option>';
        }
    }
    
    async loadBikeYears() {
        const category = document.querySelector('input[name="mainCategory"]:checked')?.value;
        const brand = document.getElementById('bikeBrandSelect').value;
        const yearSelect = document.getElementById('bikeYearSelect');
        
        if (!brand || !yearSelect) return;
        
        document.getElementById('yearSelection').style.display = 'block';
        yearSelect.innerHTML = '<option value="">Loading years...</option>';
        
        try {
            let endpoint;
            if (category === 'motorcycle') {
                endpoint = `http://localhost:8081/api/motorcycles/years?make=${encodeURIComponent(brand)}`;
            } else {
                endpoint = `http://localhost:8081/api/bicycles/years?manufacturer=${encodeURIComponent(brand)}`;
            }
            
            const response = await fetch(endpoint);
            if (response.ok) {
                const years = await response.json();
                yearSelect.innerHTML = '<option value="">Select year...</option>';
                years.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading years:', error);
            yearSelect.innerHTML = '<option value="">Error loading years</option>';
        }
    }
    
    async loadBikeModels() {
        const category = document.querySelector('input[name="mainCategory"]:checked')?.value;
        const brand = document.getElementById('bikeBrandSelect').value;
        const year = document.getElementById('bikeYearSelect').value;
        const modelSelect = document.getElementById('bikeModelSelect');
        
        if (!brand || !year || !modelSelect) return;
        
        document.getElementById('modelSelection').style.display = 'block';
        modelSelect.innerHTML = '<option value="">Loading models...</option>';
        
        try {
            let endpoint;
            if (category === 'motorcycle') {
                endpoint = `http://localhost:8081/api/motorcycles/models?make=${encodeURIComponent(brand)}&year=${year}`;
            } else {
                endpoint = `http://localhost:8081/api/bicycles/models?manufacturer=${encodeURIComponent(brand)}&year=${year}`;
            }
            
            const response = await fetch(endpoint);
            if (response.ok) {
                const models = await response.json();
                modelSelect.innerHTML = '<option value="">Select model...</option>';
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    modelSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading models:', error);
            modelSelect.innerHTML = '<option value="">Error loading models</option>';
        }
    }
    
    handleBikeSelection() {
        const brand = document.getElementById('bikeBrandSelect').value;
        const year = document.getElementById('bikeYearSelect').value;
        const model = document.getElementById('bikeModelSelect').value;
        
        if (brand && year && model) {
            // Auto-populate form fields
            document.getElementById('brand').value = brand;
            document.getElementById('year').value = year;
            document.getElementById('model').value = model;
            
            // Update selected bike info
            const selectedBikeInfo = document.getElementById('selectedBikeInfo');
            const selectedBikeName = document.getElementById('selectedBikeName');
            const selectedBikeDetails = document.getElementById('selectedBikeDetails');
            
            if (selectedBikeInfo && selectedBikeName && selectedBikeDetails) {
                selectedBikeInfo.style.display = 'block';
                selectedBikeName.textContent = `${year} ${brand} ${model}`;
                selectedBikeDetails.textContent = `Selected from bike database`;
            }
            
            // Auto-generate listing title
            const listingTitle = document.getElementById('listingTitle');
            if (listingTitle && !listingTitle.value) {
                listingTitle.value = `${year} ${brand} ${model}`;
            }
            
            this.showSuccess('Bike details populated from database!');
        }
    }
    
    addModification() {
        const container = document.getElementById('modificationsContainer');
        if (!container) return;
        
        const specRow = document.createElement('div');
        specRow.className = 'spec-row';
        specRow.innerHTML = `
            <input type="text" placeholder="e.g., Exhaust System" class="spec-key">
            <input type="text" placeholder="e.g., Akrapovic Full System" class="spec-value">
            <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(specRow);
    }
    
    setupPhotoUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const photoInput = document.getElementById('photoInput');
        const photoGrid = document.getElementById('photoGrid');
        
        // Click to upload
        uploadArea.addEventListener('click', () => photoInput.click());
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.querySelector('.upload-prompt').classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.querySelector('.upload-prompt').classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.querySelector('.upload-prompt').classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // File input change
        photoInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
    }
    
    handleFiles(files) {
        const photoGrid = document.getElementById('photoGrid');
        
        Array.from(files).forEach((file, index) => {
            if (this.photos.length >= 12) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                if (this.photos.length === 0) photoItem.classList.add('main');
                
                photoItem.innerHTML = `
                    <img src="${e.target.result}" alt="Photo ${this.photos.length + 1}">
                    <div class="photo-actions">
                        <button type="button" class="photo-action" onclick="app.setMainPhoto(${this.photos.length})">
                            ⭐
                        </button>
                        <button type="button" class="photo-action delete" onclick="app.removePhoto(${this.photos.length})">
                            🗑️
                        </button>
                    </div>
                    ${this.photos.length === 0 ? '<div class="main-photo-badge">Main Photo</div>' : ''}
                `;
                
                photoGrid.appendChild(photoItem);
                this.photos.push({
                    file: file,
                    url: e.target.result
                });
            };
            reader.readAsDataURL(file);
        });
    }
    
    setMainPhoto(index) {
        document.querySelectorAll('.photo-item').forEach((item, i) => {
            item.classList.toggle('main', i === index);
            const badge = item.querySelector('.main-photo-badge');
            if (badge) badge.remove();
            
            if (i === index) {
                item.innerHTML += '<div class="main-photo-badge">Main Photo</div>';
            }
        });
    }
    
    removePhoto(index) {
        this.photos.splice(index, 1);
        this.refreshPhotoGrid();
    }
    
    refreshPhotoGrid() {
        const photoGrid = document.getElementById('photoGrid');
        photoGrid.innerHTML = '';
        
        this.photos.forEach((photo, index) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            if (index === 0) photoItem.classList.add('main');
            
            photoItem.innerHTML = `
                <img src="${photo.url}" alt="Photo ${index + 1}">
                <div class="photo-actions">
                    <button type="button" class="photo-action" onclick="app.setMainPhoto(${index})">
                        ⭐
                    </button>
                    <button type="button" class="photo-action delete" onclick="app.removePhoto(${index})">
                        🗑️
                    </button>
                </div>
                ${index === 0 ? '<div class="main-photo-badge">Main Photo</div>' : ''}
            `;
            
            photoGrid.appendChild(photoItem);
        });
    }
    
    addSpecification() {
        const container = document.getElementById('specificationsContainer');
        const specRow = document.createElement('div');
        specRow.className = 'spec-row';
        specRow.innerHTML = `
            <input type="text" placeholder="e.g., Weight" class="spec-key">
            <input type="text" placeholder="e.g., 28 lbs" class="spec-value">
            <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(specRow);
    }
    
    updateFormData(name, value) {
        this.formData[name] = value;
        
        // Update preview if on review step
        if (this.currentStep === 5) {
            this.updatePreview();
        }
    }
    
    validateStep(step) {
        switch(step) {
            case 1:
                return document.querySelector('input[name="mainCategory"]:checked') !== null;
            case 2:
                const category = document.querySelector('input[name="mainCategory"]:checked')?.value;
                const baseValidation = document.getElementById('listingTitle').value && 
                       document.getElementById('brand').value &&
                       document.getElementById('condition').value &&
                       document.getElementById('description').value &&
                       document.getElementById('wearDescription').value;
                
                // Additional validation for motorcycles/bicycles
                if (category === 'motorcycle' || category === 'bicycle') {
                    return baseValidation && document.getElementById('odometer').value;
                }
                return baseValidation;
            case 3:
                return this.photos.length > 0;
            case 4:
                return document.getElementById('price').value && 
                       document.getElementById('location').value;
            case 5:
                return document.getElementById('agreeTerms').checked;
            default:
                return true;
        }
    }
    
    nextStep() {
        if (!this.validateStep(this.currentStep)) {
            this.showError('Please complete all required fields');
            return;
        }
        
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStep();
            
            if (this.currentStep === 5) {
                this.updatePreview();
            }
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
        }
    }
    
    updateStep() {
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        progressFill.style.width = `${(this.currentStep / this.totalSteps) * 100}%`;
        
        // Update step indicators
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            if (index + 1 < this.currentStep) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (index + 1 === this.currentStep) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        });
        
        // Show/hide steps
        document.querySelectorAll('.form-step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
        });
        
        // Update navigation buttons
        document.getElementById('prevBtn').style.display = this.currentStep === 1 ? 'none' : 'flex';
        document.getElementById('nextBtn').style.display = this.currentStep === this.totalSteps ? 'none' : 'flex';
        document.getElementById('publishBtn').style.display = this.currentStep === this.totalSteps ? 'flex' : 'none';
    }
    
    updatePreview() {
        // Update preview elements
        document.getElementById('previewTitle').textContent = this.formData.title || 'Your Listing Title';
        document.getElementById('previewPrice').textContent = this.formData.price ? `$${this.formData.price}` : '$0';
        document.getElementById('previewCategory').textContent = 
            document.querySelector('input[name="mainCategory"]:checked')?.value || '-';
        document.getElementById('previewCondition').textContent = this.formData.condition || '-';
        document.getElementById('previewLocation').textContent = this.formData.location || '-';
        document.getElementById('previewDescription').textContent = this.formData.description || '-';
        
        // Update delivery options
        const delivery = [];
        if (document.getElementById('localPickup').checked) delivery.push('Local Pickup');
        if (document.getElementById('shipping').checked) delivery.push('Shipping Available');
        document.getElementById('previewDelivery').textContent = delivery.join(', ') || '-';
        
        // Update photo gallery
        const galleryContainer = document.getElementById('previewGallery');
        galleryContainer.innerHTML = '';
        this.photos.slice(0, 4).forEach(photo => {
            const img = document.createElement('img');
            img.src = photo.url;
            galleryContainer.appendChild(img);
        });
    }
    
    saveDraft() {
        console.log('Saving draft...', this.formData);
        this.showSuccess('Draft saved successfully!');
    }
    
    async publishListing() {
        if (!this.validateStep(5)) {
            this.showError('Please agree to the terms and conditions');
            return;
        }
        
        // Simulate API call
        console.log('Publishing listing...', this.formData);
        
        // Show success modal
        document.getElementById('successModal').style.display = 'flex';
    }
    
    showError(message) {
        // Simple error notification
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
    
    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #00ff88;
            color: #0a0e27;
            padding: 16px 24px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize app
const app = new SellItemApp();