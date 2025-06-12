// Marketplace Create Listing JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Form step management
    let currentStep = 1;
    const totalSteps = 5;
    
    // Get DOM elements
    const form = document.getElementById('createListingForm');
    const prevBtn = document.getElementById('marketplace-create-listing-prev-btn');
    const nextBtn = document.getElementById('marketplace-create-listing-next-btn');
    const submitBtn = document.getElementById('marketplace-create-listing-submit-btn');
    const progressSteps = document.querySelectorAll('.marketplace-create-listing-progress-step');
    const formSteps = document.querySelectorAll('.marketplace-create-listing-step');
    
    // Source selection
    const sourceSelection = document.getElementById('sourceSelection');
    const itemSelection = document.getElementById('itemSelection');
    const mainForm = document.getElementById('mainForm');
    const sourceOptions = document.querySelectorAll('.source-option');
    
    // Initialize - show source selection
    sourceSelection.style.display = 'block';
    
    // Source selection handlers
    sourceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const source = option.dataset.source;
            
            if (source === 'custom') {
                // Go directly to form
                sourceSelection.style.display = 'none';
                mainForm.style.display = 'block';
                updateStep(1);
            } else {
                // Show item selection
                sourceSelection.style.display = 'none';
                itemSelection.style.display = 'block';
                
                // Load items based on source
                if (source === 'garage') {
                    document.getElementById('selectionTitle').textContent = 'Select a bike from your garage';
                    // TODO: Load bikes from garage
                } else if (source === 'gear') {
                    document.getElementById('selectionTitle').textContent = 'Select gear from your collection';
                    // TODO: Load gear items
                }
            }
        });
    });
    
    // Back to source button
    document.getElementById('backToSource').addEventListener('click', () => {
        itemSelection.style.display = 'none';
        sourceSelection.style.display = 'block';
    });
    
    // Step navigation
    function updateStep(step) {
        currentStep = step;
        
        // Update progress bar
        progressSteps.forEach((progressStep, index) => {
            if (index < step) {
                progressStep.classList.add('marketplace-create-listing-step-active');
            } else {
                progressStep.classList.remove('marketplace-create-listing-step-active');
            }
        });
        
        // Show/hide form steps
        formSteps.forEach((formStep, index) => {
            if (index === step - 1) {
                formStep.style.display = 'block';
            } else {
                formStep.style.display = 'none';
            }
        });
        
        // Update navigation buttons
        prevBtn.style.display = step === 1 ? 'none' : 'inline-flex';
        nextBtn.style.display = step === totalSteps ? 'none' : 'inline-flex';
        submitBtn.style.display = step === totalSteps ? 'inline-flex' : 'none';
    }
    
    // Navigation button handlers
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            updateStep(currentStep - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                updateStep(currentStep + 1);
            }
            
            // Update review if on last step
            if (currentStep === totalSteps - 1) {
                updateReview();
            }
        }
    });
    
    // Form validation
    function validateStep(step) {
        // Add validation logic for each step
        return true; // For now, always pass
    }
    
    // Update review
    function updateReview() {
        // Update review elements with form data
        document.getElementById('marketplace-create-listing-review-title').textContent = 
            document.getElementById('marketplace-create-listing-title').value || '-';
        // Add more review updates...
    }
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Show success modal
        document.getElementById('marketplace-create-listing-success-modal').style.display = 'block';
    });
    
    // Photo upload handlers
    const photoInputs = document.querySelectorAll('.marketplace-create-listing-photo-input');
    photoInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const slot = input.closest('.marketplace-create-listing-photo-slot');
                    const preview = slot.querySelector('.marketplace-create-listing-photo-preview');
                    const img = preview.querySelector('img');
                    
                    img.src = e.target.result;
                    preview.style.display = 'block';
                    slot.querySelector('.marketplace-create-listing-photo-label').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    });
    
    // Photo remove handlers
    const removeButtons = document.querySelectorAll('.marketplace-create-listing-photo-remove');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const slot = btn.closest('.marketplace-create-listing-photo-slot');
            const input = slot.querySelector('.marketplace-create-listing-photo-input');
            const preview = slot.querySelector('.marketplace-create-listing-photo-preview');
            const label = slot.querySelector('.marketplace-create-listing-photo-label');
            
            input.value = '';
            preview.style.display = 'none';
            label.style.display = 'flex';
        });
    });
    
    // Modal close handlers
    document.querySelectorAll('.marketplace-create-listing-modal-close, .marketplace-create-listing-modal-overlay').forEach(el => {
        el.addEventListener('click', () => {
            el.closest('.marketplace-create-listing-modal').style.display = 'none';
        });
    });
});