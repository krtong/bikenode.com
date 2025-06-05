// Add Bike Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addBikeForm');
    const makeSelect = document.getElementById('make');
    const yearSelect = document.getElementById('year');
    const modelSelect = document.getElementById('model');
    const bikeTypeInputs = document.querySelectorAll('input[name="bikeType"]');
    
    let currentBikeType = null;
    
    // Handle bike type selection
    bikeTypeInputs.forEach(radio => {
        radio.addEventListener('change', function() {
            document.querySelectorAll('.bike-type-card').forEach(card => {
                card.classList.remove('selected');
            });
            this.closest('.bike-type-card').classList.add('selected');
            
            currentBikeType = this.value;
            
            // Clear and reload makes when bike type changes
            clearSelect(makeSelect);
            clearSelect(yearSelect);
            clearSelect(modelSelect);
            
            if (currentBikeType === 'motorcycle') {
                loadMotorcycleMakes();
            }
        });
    });
    
    // Load motorcycle makes
    async function loadMotorcycleMakes() {
        try {
            const response = await fetch('/api/motorcycles/makes');
            const makes = await response.json();
            
            clearSelect(makeSelect);
            makeSelect.disabled = false;
            
            makes.forEach(make => {
                const option = document.createElement('option');
                option.value = make;
                option.textContent = make;
                makeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading makes:', error);
            showError('Failed to load manufacturers');
        }
    }
    
    // Handle make selection
    makeSelect.addEventListener('change', function() {
        const selectedMake = this.value;
        clearSelect(yearSelect);
        clearSelect(modelSelect);
        
        if (selectedMake && currentBikeType === 'motorcycle') {
            loadMotorcycleYears(selectedMake);
        }
    });
    
    // Load motorcycle years for selected make
    async function loadMotorcycleYears(make) {
        try {
            const response = await fetch(`/api/motorcycles/years/${encodeURIComponent(make)}`);
            const years = await response.json();
            
            clearSelect(yearSelect);
            yearSelect.disabled = false;
            
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading years:', error);
            showError('Failed to load years');
        }
    }
    
    // Handle year selection
    yearSelect.addEventListener('change', function() {
        const selectedMake = makeSelect.value;
        const selectedYear = this.value;
        clearSelect(modelSelect);
        
        if (selectedMake && selectedYear && currentBikeType === 'motorcycle') {
            loadMotorcycleModels(selectedMake, selectedYear);
        }
    });
    
    // Load motorcycle models for selected make and year
    async function loadMotorcycleModels(make, year) {
        try {
            const response = await fetch(`/api/motorcycles/models/${encodeURIComponent(make)}/${year}`);
            const motorcycles = await response.json();
            
            clearSelect(modelSelect);
            modelSelect.disabled = false;
            
            // Create unique model options
            const uniqueModels = new Map();
            motorcycles.forEach(moto => {
                const displayName = moto.package ? `${moto.model} - ${moto.package}` : moto.model;
                uniqueModels.set(displayName, moto);
            });
            
            uniqueModels.forEach((moto, displayName) => {
                const option = document.createElement('option');
                option.value = moto.id;
                option.textContent = displayName;
                option.dataset.model = moto.model;
                option.dataset.package = moto.package || '';
                option.dataset.category = moto.category || '';
                option.dataset.engine = moto.engine || '';
                modelSelect.appendChild(option);
            });
            
            // If only one model, select it automatically
            if (uniqueModels.size === 1) {
                modelSelect.selectedIndex = 1;
            }
        } catch (error) {
            console.error('Error loading models:', error);
            showError('Failed to load models');
        }
    }
    
    // Clear select options
    function clearSelect(selectElement) {
        const firstOption = selectElement.options[0];
        selectElement.innerHTML = '';
        selectElement.appendChild(firstOption);
        selectElement.disabled = true;
    }
    
    // Show error message
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('.btn-primary');
        const originalText = submitBtn.textContent;
        
        // Validate required fields
        if (!currentBikeType) {
            showError('Please select a bike type');
            return;
        }
        
        if (!makeSelect.value || !yearSelect.value || !modelSelect.value) {
            showError('Please select make, year, and model');
            return;
        }
        
        // Show loading state
        submitBtn.textContent = 'Adding to Garage...';
        submitBtn.disabled = true;
        
        // Collect form data
        const formData = new FormData(form);
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        
        const bikeData = {
            type: currentBikeType,
            make: makeSelect.value,
            year: parseInt(yearSelect.value),
            model: selectedOption.dataset.model,
            package: selectedOption.dataset.package,
            category: selectedOption.dataset.category,
            engine: selectedOption.dataset.engine,
            nickname: formData.get('nickname'),
            vin: formData.get('vin'),
            purchaseDate: formData.get('purchaseDate'),
            purchasePrice: formData.get('purchasePrice') ? parseFloat(formData.get('purchasePrice')) : null,
            mileage: formData.get('mileage') ? parseInt(formData.get('mileage')) : null,
            condition: formData.get('condition'),
            privacy: formData.get('privacy'),
            photos: [] // Would handle file uploads here
        };
        
        // Simulate API call (replace with actual API endpoint)
        try {
            // In a real implementation, you would POST to your API here
            console.log('Bike data to save:', bikeData);
            
            // Simulate success
            setTimeout(() => {
                submitBtn.textContent = 'Added Successfully!';
                setTimeout(() => {
                    window.location.href = './virtual-garage-dashboard.html';
                }, 1000);
            }, 1500);
        } catch (error) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            showError('Failed to add bike. Please try again.');
        }
    });
    
    // Photo upload preview
    document.getElementById('photoInput').addEventListener('change', function(e) {
        const preview = document.getElementById('photoPreview');
        preview.innerHTML = '';
        
        for (let file of e.target.files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
    });
});