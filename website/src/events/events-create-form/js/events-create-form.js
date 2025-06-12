// events-create-form.js
document.addEventListener('DOMContentLoaded', function() {
    // Event type selection
    const typeOptions = document.querySelectorAll('.events-create-form-type-option');
    typeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            typeOptions.forEach(opt => opt.classList.remove('events-create-form-type-option-selected'));
            
            // Add selected class to clicked option
            this.classList.add('events-create-form-type-option-selected');
            
            // Update hidden input
            const typeValue = this.getAttribute('data-type');
            const typeInput = document.getElementById('event-type-input');
            if (typeInput) {
                typeInput.value = typeValue;
            }
            
            console.log('Event type selected:', typeValue);
        });
    });

    // Image upload
    const uploadArea = document.querySelector('.events-create-form-upload');
    const fileInput = document.getElementById('event-image-input');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const fileName = e.target.files[0].name;
                console.log('File selected:', fileName);
                
                // Update upload area text
                const uploadText = uploadArea.querySelector('.events-create-form-upload-text');
                if (uploadText) {
                    uploadText.textContent = `Selected: ${fileName}`;
                }
            }
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = 'var(--color-accent)';
            this.style.background = 'rgba(var(--color-accent-rgb), 0.05)';
        });
        
        uploadArea.addEventListener('dragleave', function() {
            this.style.borderColor = '';
            this.style.background = '';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '';
            this.style.background = '';
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                fileInput.files = e.dataTransfer.files;
                const fileName = e.dataTransfer.files[0].name;
                
                const uploadText = this.querySelector('.events-create-form-upload-text');
                if (uploadText) {
                    uploadText.textContent = `Selected: ${fileName}`;
                }
            }
        });
    }

    // Form validation
    const form = document.getElementById('events-create-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear previous errors
            document.querySelectorAll('.events-create-form-error-message').forEach(err => err.remove());
            document.querySelectorAll('.events-create-form-input-error').forEach(inp => {
                inp.classList.remove('events-create-form-input-error');
            });
            
            let isValid = true;
            
            // Validate required fields
            const requiredFields = form.querySelectorAll('[required]');
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('events-create-form-input-error');
                    
                    const error = document.createElement('div');
                    error.className = 'events-create-form-error-message';
                    error.textContent = 'This field is required';
                    field.parentElement.appendChild(error);
                }
            });
            
            // Validate date
            const startDate = document.getElementById('event-start-date');
            const endDate = document.getElementById('event-end-date');
            if (startDate && endDate && startDate.value && endDate.value) {
                if (new Date(startDate.value) > new Date(endDate.value)) {
                    isValid = false;
                    endDate.classList.add('events-create-form-input-error');
                    
                    const error = document.createElement('div');
                    error.className = 'events-create-form-error-message';
                    error.textContent = 'End date must be after start date';
                    endDate.parentElement.appendChild(error);
                }
            }
            
            if (isValid) {
                console.log('Form is valid, submitting...');
                // Add actual form submission logic here
            }
        });
    }

    // Cancel button
    const cancelButton = document.querySelector('.events-create-form-button-secondary');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
                window.location.href = '/events/events-browse-calendar/';
            }
        });
    }
});