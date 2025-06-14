// Multi-stage signup form functionality
let currentStep = 1;
const totalSteps = 5;

// Brand data based on vehicle types
const brandData = {
    motorcycle: {
        title: 'Motorcycle Brands',
        brands: ['Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'Harley-Davidson', 'BMW', 'Ducati', 'KTM', 'Triumph', 'Indian', 'Royal Enfield', 'Aprilia', 'Moto Guzzi', 'Zero', 'LiveWire', 'Energica']
    },
    bicycle: {
        title: 'Bicycle Brands',
        brands: ['Trek', 'Specialized', 'Giant', 'Cannondale', 'Scott', 'Santa Cruz', 'Yeti', 'Pivot', 'Ibis', 'Canyon', 'Cervelo', 'BMC', 'Pinarello', 'Bianchi', 'Kona', 'Norco']
    },
    'cabin-bikes': {
        title: 'Cabin Bike Brands',
        brands: ['Lit Motors', 'Nimbus', 'MonoTracer', 'Peraves', 'C1 (BMW)', 'Carver', 'Elio Motors']
    },
    escooters: {
        title: 'E-Scooter Brands',
        brands: ['NIU', 'Gogoro', 'Yadea', 'Super Soco', 'Silence', 'Vespa Elettrica', 'BMW CE', 'Kymco', 'Vmoto', 'Segway', 'Unagi', 'Apollo']
    },
    emtb: {
        title: 'E-MTB Brands',
        brands: ['Specialized Turbo', 'Trek Rail', 'Giant Trance E+', 'Scott E-Genius', 'Orbea Wild', 'YT Decoy', 'Canyon Spectral:ON', 'Haibike', 'Bulls', 'Focus', 'Merida eOne', 'Norco Sight VLT']
    },
    emotos: {
        title: 'E-Moto Brands',
        brands: ['Sur Ron', 'Talaria', 'Segway', 'Cake', 'Electric Motion', 'Stark Future', 'KTM Freeride E', 'Oset', 'Kuberg', 'Bultaco', 'Torrot']
    }
};

// Navigate to next step
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            currentStep++;
            updateStepDisplay();
            
            // Load brands when reaching step 5
            if (currentStep === 5) {
                loadBrandsBasedOnInterests();
            }
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
            return validateProfileStep();
        case 3:
            return true; // Verification is optional
        case 4:
            return validateInterestsStep();
        case 5:
            return true; // Brand selection is optional
        default:
            return true;
    }
}

// Validate account step
function validateAccountStep() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!email || !password || !confirmPassword) {
        alert('Please fill in all required fields');
        return false;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return false;
    }
    
    if (password.length < 8) {
        alert('Password must be at least 8 characters long');
        return false;
    }
    
    return true;
}

// Validate profile step
function validateProfileStep() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const username = document.getElementById('username').value;
    
    if (!firstName || !lastName || !username) {
        alert('Please fill in all required fields');
        return false;
    }
    
    return true;
}

// Validate interests step
function validateInterestsStep() {
    const selectedInterests = document.querySelectorAll('input[name="interests"]:checked');
    
    if (selectedInterests.length === 0) {
        alert('Please select at least one interest');
        return false;
    }
    
    return true;
}

// Toggle verification upload
function toggleVerificationUpload() {
    const checkbox = document.getElementById('wantVerification');
    const uploadSection = document.getElementById('verificationUpload');
    
    if (checkbox.checked) {
        uploadSection.style.display = 'block';
    } else {
        uploadSection.style.display = 'none';
    }
}

// Load brands based on selected interests
function loadBrandsBasedOnInterests() {
    const selectedInterests = document.querySelectorAll('input[name="interests"]:checked');
    const brandCategories = document.getElementById('brandCategories');
    
    brandCategories.innerHTML = '';
    
    selectedInterests.forEach(interest => {
        const category = interest.value;
        if (brandData[category]) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'auth-signup-page-brand-category';
            
            const title = document.createElement('h4');
            title.textContent = brandData[category].title;
            categoryDiv.appendChild(title);
            
            const brandList = document.createElement('div');
            brandList.className = 'auth-signup-page-brand-list';
            
            brandData[category].brands.forEach(brand => {
                const brandChip = document.createElement('button');
                brandChip.type = 'button';
                brandChip.className = 'auth-signup-page-brand-chip';
                brandChip.textContent = brand;
                brandChip.onclick = () => toggleBrand(brand, brandChip);
                brandList.appendChild(brandChip);
            });
            
            categoryDiv.appendChild(brandList);
            brandCategories.appendChild(categoryDiv);
        }
    });
}

// Toggle brand selection
const selectedBrands = new Set();

function toggleBrand(brand, element) {
    if (selectedBrands.has(brand)) {
        selectedBrands.delete(brand);
        element.classList.remove('selected');
    } else {
        selectedBrands.add(brand);
        element.classList.add('selected');
    }
    
    updateSelectedBrandsDisplay();
}

// Update selected brands display
function updateSelectedBrandsDisplay() {
    const selectedCount = document.getElementById('selectedCount');
    const selectedList = document.getElementById('selectedBrandsList');
    
    selectedCount.textContent = selectedBrands.size;
    
    selectedList.innerHTML = '';
    selectedBrands.forEach(brand => {
        const chip = document.createElement('span');
        chip.className = 'auth-signup-page-brand-chip selected';
        chip.textContent = brand;
        selectedList.appendChild(chip);
    });
}

// Handle file upload
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('licenseUpload');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const uploadPlaceholder = document.querySelector('.auth-signup-page-upload-placeholder');
                uploadPlaceholder.innerHTML = `
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <p>${file.name}</p>
                    <span>File uploaded successfully</span>
                `;
            }
        });
    }
    
    // Handle form submission
    const signupForm = document.getElementById('signupForm');
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Collect all form data
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            username: document.getElementById('username').value,
            location: document.getElementById('location').value,
            wantVerification: document.getElementById('wantVerification').checked,
            interests: Array.from(document.querySelectorAll('input[name="interests"]:checked')).map(cb => cb.value),
            brands: Array.from(selectedBrands)
        };
        
        console.log('Signup data:', formData);
        
        // Here you would typically send the data to your backend
        alert('Account created successfully! Redirecting to dashboard...');
        
        // Redirect to dashboard or login page
        window.location.href = '/dashboard-overview/dashboard-home-page/';
    });
    
    // Password strength indicator
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function(e) {
            const password = e.target.value;
            const strengthBar = document.querySelector('.auth-signup-page-password-strength-bar');
            const strengthText = document.querySelector('.auth-signup-page-password-strength-text');
            
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