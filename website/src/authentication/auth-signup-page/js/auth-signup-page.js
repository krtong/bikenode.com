// Multi-stage signup form functionality
let currentStep = 1;
const totalSteps = 3;

// Category definitions for each vehicle type
const vehicleCategories = {
    motorcycle: {
        name: 'Motorcycles',
        categories: [
            'Sport/Performance',
            'Street/Naked', 
            'Touring',
            'Cruiser',
            'Adventure',
            'Dual Sport/Enduro',
            'Off-Road Only',
            'Scooter/Moped',
            'Electric',
            'Custom/Classic'
        ]
    },
    bicycle: {
        name: 'Bicycles',
        categories: [
            'Road',
            'Mountain',
            'Gravel/Adventure',
            'Commuter/Urban',
            'Hybrid/Fitness',
            'BMX/Dirt Jump',
            'Touring',
            'Cargo/Utility',
            'Folding',
            'Track/Fixed'
        ]
    },
    'cabin-bikes': {
        name: 'Cabin Bikes',
        categories: [
            'Fully Enclosed',
            'Semi-Enclosed',
            'Three-Wheeler',
            'Tilting Three-Wheeler',
            'Autocycle',
            'Velomobile'
        ]
    },
    escooters: {
        name: 'E-Scooters',
        categories: [
            'Standing Commuter',
            'Performance',
            'Seated/Moped Style',
            'Off-Road',
            'Three-Wheel',
            'Cargo/Delivery'
        ]
    },
    emtb: {
        name: 'E-MTB & E-Bikes',
        categories: [
            'E-Mountain',
            'E-Road',
            'E-Gravel',
            'E-Commuter',
            'E-Cargo',
            'Speed Pedelec'
        ]
    },
    emotos: {
        name: 'E-Motos',
        categories: [
            'Light Electric (Sur Ron type)',
            'Electric Dirt Bike',
            'Electric Dual Sport',
            'Electric Street',
            'Electric Trials'
        ]
    }
};

// Navigate to next step
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            
            // If moving to step 3, generate categories based on selected interests
            if (currentStep === 3) {
                generateCategorySelections();
            }
            
            updateStepDisplay();
        }
    }
}

// Navigate to previous step
function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

// Update the display based on current step
function updateStepDisplay() {
    // Update progress bar
    const progressFill = document.querySelector('.auth-signup-page-progress-fill');
    progressFill.style.width = `${(currentStep / totalSteps) * 100}%`;
    
    // Update step indicators
    document.querySelectorAll('.auth-signup-page-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        if (stepNum <= currentStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Show/hide step content
    document.querySelectorAll('.auth-signup-page-step-content').forEach(content => {
        const stepNum = parseInt(content.dataset.step);
        if (stepNum === currentStep) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Validate current step
function validateCurrentStep() {
    switch(currentStep) {
        case 1:
            return validateAccountStep();
        case 2:
            return validateInterestsStep();
        case 3:
            return true; // Categories are optional
        default:
            return true;
    }
}

// Validate interests step
function validateInterestsStep() {
    const selectedInterests = document.querySelectorAll('input[name="interests"]:checked');
    
    if (selectedInterests.length === 0) {
        alert('Please select at least one vehicle type');
        return false;
    }
    
    return true;
}

// Validate account step
function validateAccountStep() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!firstName || !lastName || !email || !password) {
        alert('Please fill in all required fields');
        return false;
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return false;
    }
    
    return true;
}

// Skip categories and complete signup
function skipCategories() {
    const signupForm = document.getElementById('signupForm');
    const event = new Event('submit', { cancelable: true });
    signupForm.dispatchEvent(event);
}

// Generate category selections based on selected vehicle types
function generateCategorySelections() {
    const selectedInterests = document.querySelectorAll('input[name="interests"]:checked');
    const categoriesContainer = document.getElementById('categoriesContainer');
    
    // Clear existing content
    categoriesContainer.innerHTML = '';
    
    // If no interests selected, show message
    if (selectedInterests.length === 0) {
        categoriesContainer.innerHTML = '<p class="auth-signup-page-no-selection">Please go back and select at least one vehicle type.</p>';
        return;
    }
    
    // Generate category sections for each selected interest
    selectedInterests.forEach(interest => {
        const vehicleType = interest.value;
        const vehicleData = vehicleCategories[vehicleType];
        
        if (vehicleData) {
            const section = document.createElement('div');
            section.className = 'auth-signup-page-category-section';
            
            section.innerHTML = `
                <h3 class="auth-signup-page-category-title">${vehicleData.name}</h3>
                <div class="auth-signup-page-category-grid">
                    ${vehicleData.categories.map(category => `
                        <label class="auth-signup-page-category-item">
                            <input type="checkbox" name="categories-${vehicleType}" value="${category}">
                            <span>${category}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            
            categoriesContainer.appendChild(section);
        }
    });
}


// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect all form data
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            interests: Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value),
            categories: {}
        };
        
        // Collect selected categories for each vehicle type
        formData.interests.forEach(interest => {
            const categoryCheckboxes = document.querySelectorAll(`input[name="categories-${interest}"]:checked`);
            if (categoryCheckboxes.length > 0) {
                formData.categories[interest] = Array.from(categoryCheckboxes).map(cb => cb.value);
            }
        });
        
        console.log('Signup data:', formData);
        
        // Here you would typically send the data to your backend
        // Store signup completion flag
        localStorage.setItem('justSignedUp', 'true');
        
        // Redirect to verification prompt
        window.location.href = '/authentication/auth-verification-prompt/';
    });
    
    // Password strength indicator
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function(e) {
            const password = e.target.value;
            const strengthBar = document.querySelector('.auth-signup-page-password-strength-bar');
            const strengthText = document.querySelector('.auth-signup-page-password-strength-text');
            
            if (!strengthBar || !strengthText) return;
            
            let strength = 0;
            let strengthLabel = 'Weak';
            let strengthColor = '#ef4444';
            
            if (password.length >= 8) strength++;
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
            if (password.match(/[0-9]/)) strength++;
            if (password.match(/[^a-zA-Z0-9]/)) strength++;
            
            switch(strength) {
                case 0:
                case 1:
                    strengthLabel = 'Weak';
                    strengthColor = '#ef4444';
                    break;
                case 2:
                    strengthLabel = 'Fair';
                    strengthColor = '#f59e0b';
                    break;
                case 3:
                    strengthLabel = 'Good';
                    strengthColor = '#10b981';
                    break;
                case 4:
                    strengthLabel = 'Strong';
                    strengthColor = '#059669';
                    break;
            }
            
            strengthBar.innerHTML = `<div style="width: ${strength * 25}%; height: 100%; background: ${strengthColor}; border-radius: 2px; transition: all 0.3s;"></div>`;
            strengthText.textContent = `Password strength: ${strengthLabel}`;
        });
    }
});