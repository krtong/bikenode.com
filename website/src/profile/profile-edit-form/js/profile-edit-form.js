// profile-edit-form.js
document.addEventListener('DOMContentLoaded', function() {
    // Avatar upload functionality
    const avatarOverlay = document.querySelector('.profile-edit-form-avatar-overlay');
    const avatarInput = document.getElementById('avatar-input');
    const avatarImage = document.querySelector('.profile-edit-form-avatar-image');
    const avatarPlaceholder = document.querySelector('.profile-edit-form-avatar-placeholder');
    
    if (avatarOverlay && avatarInput) {
        avatarOverlay.addEventListener('click', function() {
            avatarInput.click();
        });
        
        avatarInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    if (avatarImage) {
                        avatarImage.src = e.target.result;
                        avatarImage.style.display = 'block';
                    }
                    if (avatarPlaceholder) {
                        avatarPlaceholder.style.display = 'none';
                    }
                };
                
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    // Upload button
    const uploadButton = document.querySelector('[data-action="upload"]');
    if (uploadButton) {
        uploadButton.addEventListener('click', function() {
            if (avatarInput) {
                avatarInput.click();
            }
        });
    }

    // Remove avatar button
    const removeButton = document.querySelector('[data-action="remove"]');
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            if (avatarImage) {
                avatarImage.style.display = 'none';
            }
            if (avatarPlaceholder) {
                avatarPlaceholder.style.display = 'flex';
            }
            if (avatarInput) {
                avatarInput.value = '';
            }
        });
    }

    // Privacy settings
    const privacyOptions = document.querySelectorAll('.profile-edit-form-privacy-option');
    privacyOptions.forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('.profile-edit-form-privacy-radio');
            if (radio) {
                radio.checked = true;
            }
        });
    });

    // Form validation and submission
    const form = document.getElementById('profile-edit-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            let isValid = true;
            const requiredFields = form.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('profile-edit-form-input-error');
                } else {
                    field.classList.remove('profile-edit-form-input-error');
                }
            });
            
            if (isValid) {
                console.log('Form submitted');
                
                // Show success message
                const successMessage = document.querySelector('.profile-edit-form-success');
                if (successMessage) {
                    successMessage.style.display = 'block';
                    successMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    // Hide after 5 seconds
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 5000);
                }
            }
        });
    }

    // Cancel button
    const cancelButton = document.querySelector('.profile-edit-form-cancel');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                window.location.href = '/profile/profile-my-page/';
            }
        });
    }

    // Character counter for bio
    const bioTextarea = document.getElementById('profile-bio');
    if (bioTextarea) {
        const maxLength = 500;
        const helpText = bioTextarea.parentElement.querySelector('.profile-edit-form-help');
        
        function updateCharCount() {
            const remaining = maxLength - bioTextarea.value.length;
            if (helpText) {
                helpText.textContent = `${remaining} characters remaining`;
                if (remaining < 50) {
                    helpText.style.color = 'var(--color-error)';
                } else {
                    helpText.style.color = 'var(--color-text-secondary)';
                }
            }
        }
        
        bioTextarea.addEventListener('input', updateCharCount);
        updateCharCount(); // Initial count
    }
});