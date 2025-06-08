// Edit Profile Enhanced JavaScript

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  initializeEditProfile();
});

function initializeEditProfile() {
  // Initialize all components
  initializeTabs();
  initializeAvatarUpload();
  initializeBannerUpload();
  initializeFormValidation();
  initializeUnsavedChanges();
  initializePasswordStrength();
  initializeUsernameCheck();
  initializeCharacterCounter();
  initializeMeasurementUnits();
  initializeTagSelection();
  initializePrivacyToggles();
  initializeModal();
  
  // Set initial state
  markSaved();
}

// Tab Management
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      // Update active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      
      // Update URL hash
      window.location.hash = tabId;
      
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  
  // Load tab from URL hash
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const tabBtn = document.querySelector(`[data-tab="${hash}"]`);
    if (tabBtn) {
      tabBtn.click();
    }
  }
}

// Avatar Upload
function initializeAvatarUpload() {
  const avatarInput = document.getElementById('avatarInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const currentAvatar = document.getElementById('currentAvatar');
  
  // Click on preview to upload
  avatarPreview.addEventListener('click', () => {
    avatarInput.click();
  });
  
  // Handle file selection
  avatarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 5 * 1024 * 1024) {
        showMessage('File size too large. Maximum 5MB allowed.', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        currentAvatar.src = e.target.result;
        markUnsaved();
        
        // Add loading animation
        avatarPreview.classList.add('loading');
        setTimeout(() => {
          avatarPreview.classList.remove('loading');
        }, 500);
      };
      reader.readAsDataURL(file);
    }
  });
}

// Banner Upload
function initializeBannerUpload() {
  const bannerInput = document.getElementById('bannerInput');
  const bannerPreview = document.getElementById('bannerPreview');
  const currentBanner = document.getElementById('currentBanner');
  
  // Click on preview to upload
  bannerPreview.addEventListener('click', () => {
    bannerInput.click();
  });
  
  // Handle file selection
  bannerInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 10 * 1024 * 1024) {
        showMessage('File size too large. Maximum 10MB allowed.', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        currentBanner.src = e.target.result;
        currentBanner.style.display = 'block';
        markUnsaved();
        
        // Add loading animation
        bannerPreview.classList.add('loading');
        setTimeout(() => {
          bannerPreview.classList.remove('loading');
        }, 500);
      };
      reader.readAsDataURL(file);
    }
  });
}

// Remove avatar function
window.removeAvatar = function() {
  if (confirm('Are you sure you want to remove your profile picture?')) {
    document.getElementById('currentAvatar').src = '/assets/images/nerd_blank_profile.png';
    document.getElementById('avatarInput').value = '';
    markUnsaved();
    showMessage('Profile picture removed', 'info');
  }
};

// Remove banner function
window.removeBanner = function() {
  if (confirm('Are you sure you want to remove your banner image?')) {
    document.getElementById('currentBanner').src = '';
    document.getElementById('currentBanner').style.display = 'none';
    document.getElementById('bannerInput').value = '';
    markUnsaved();
    showMessage('Banner image removed', 'info');
  }
};

// Form Validation
function initializeFormValidation() {
  const form = document.getElementById('editProfileForm');
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.classList.add('error');
        field.addEventListener('input', function() {
          this.classList.remove('error');
        }, { once: true });
      }
    });
    
    if (!isValid) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('.save-btn');
    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = '<span class="loading-spinner">⏳</span> Saving...';
    saveBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
      // Reset button
      saveBtn.innerHTML = originalHTML;
      saveBtn.disabled = false;
      
      // Show success message
      showMessage('Profile updated successfully!', 'success');
      markSaved();
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
  });
}

// Unsaved Changes Tracking
let hasUnsavedChanges = false;

function initializeUnsavedChanges() {
  // Track all form inputs
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('change', markUnsaved);
    input.addEventListener('input', markUnsaved);
  });
  
  // Warn before leaving
  window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

function markUnsaved() {
  hasUnsavedChanges = true;
  document.getElementById('unsavedIndicator').style.display = 'block';
  document.querySelector('.save-btn').classList.add('highlight');
}

function markSaved() {
  hasUnsavedChanges = false;
  document.getElementById('unsavedIndicator').style.display = 'none';
  document.querySelector('.save-btn').classList.remove('highlight');
}

// Password Strength
function initializePasswordStrength() {
  const newPasswordInput = document.getElementById('newPassword');
  if (!newPasswordInput) return;
  
  newPasswordInput.addEventListener('input', function() {
    const password = this.value;
    const strengthEl = document.getElementById('passwordStrength');
    
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) score++;
    else feedback.push('8+ characters');
    
    if (password.length >= 12) score++;
    
    // Character type checks
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('uppercase letter');
    
    if (/[a-z]/.test(password)) score++;
    else feedback.push('lowercase letter');
    
    if (/\d/.test(password)) score++;
    else feedback.push('number');
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('special character');
    
    // Update UI
    const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][score];
    const color = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#16a34a'][score];
    
    strengthEl.innerHTML = `
      <div class="strength-bar">
        <div class="strength-fill" style="width: ${(score / 6) * 100}%; background: ${color};"></div>
      </div>
      <div class="strength-text" style="color: ${color};">${strength}</div>
      ${feedback.length ? `<div class="strength-feedback">Add: ${feedback.join(', ')}</div>` : ''}
    `;
  });
}

// Username Availability Check
function initializeUsernameCheck() {
  const usernameInput = document.getElementById('username');
  const availabilityCheck = document.getElementById('usernameAvailability');
  const usernamePreview = document.querySelector('.username-preview');
  
  let checkTimeout;
  
  usernameInput.addEventListener('input', function() {
    clearTimeout(checkTimeout);
    const username = this.value;
    
    // Update preview
    usernamePreview.textContent = `bikenode.com/@${username}`;
    
    if (username.length < 3) {
      availabilityCheck.textContent = '';
      return;
    }
    
    // Show checking state
    availabilityCheck.textContent = 'Checking...';
    availabilityCheck.className = 'availability-check checking';
    
    // Simulate API check
    checkTimeout = setTimeout(() => {
      // Mock availability check
      const isAvailable = username !== 'taken' && Math.random() > 0.3;
      
      if (isAvailable) {
        availabilityCheck.textContent = '✓ Available';
        availabilityCheck.className = 'availability-check available';
      } else {
        availabilityCheck.textContent = '✗ Already taken';
        availabilityCheck.className = 'availability-check taken';
      }
    }, 800);
  });
}

// Character Counter
function initializeCharacterCounter() {
  const bioTextarea = document.getElementById('bio');
  const charCount = document.querySelector('.char-count');
  
  function updateCharCount() {
    const length = bioTextarea.value.length;
    const maxLength = 500;
    charCount.textContent = `${length} / ${maxLength} characters`;
    
    // Change color based on usage
    if (length > maxLength * 0.9) {
      charCount.style.color = '#ef4444';
    } else if (length > maxLength * 0.8) {
      charCount.style.color = '#f59e0b';
    } else {
      charCount.style.color = 'var(--text-secondary)';
    }
  }
  
  bioTextarea.addEventListener('input', updateCharCount);
  updateCharCount(); // Initial count
}

// Measurement Units
function initializeMeasurementUnits() {
  // Height unit conversion
  const heightInput = document.getElementById('userHeight');
  const heightUnit = document.getElementById('heightUnit');
  
  heightUnit.addEventListener('change', function() {
    const value = parseFloat(heightInput.value);
    if (!value) return;
    
    if (this.value === 'metric') {
      // Convert feet/inches to cm
      const feet = Math.floor(value);
      const inches = (value - feet) * 10; // Assuming decimal format
      const totalInches = feet * 12 + inches;
      heightInput.value = Math.round(totalInches * 2.54);
      heightInput.placeholder = '188';
    } else {
      // Convert cm to feet/inches
      const totalInches = value / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      heightInput.value = `${feet}.${inches}`;
      heightInput.placeholder = '6.2';
    }
  });
  
  // Weight unit conversion
  const weightInput = document.getElementById('userWeight');
  const weightUnit = document.getElementById('weightUnit');
  
  weightUnit.addEventListener('change', function() {
    const value = parseFloat(weightInput.value);
    if (!value) return;
    
    if (this.value === 'kg') {
      // Convert lbs to kg
      weightInput.value = Math.round(value / 2.205);
    } else {
      // Convert kg to lbs
      weightInput.value = Math.round(value * 2.205);
    }
  });
}

// Tag Selection
function initializeTagSelection() {
  const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
  
  tagCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('click', function() {
      const input = this.querySelector('input');
      input.checked = !input.checked;
      
      if (input.checked) {
        this.classList.add('selected');
      } else {
        this.classList.remove('selected');
      }
      
      markUnsaved();
    });
    
    // Set initial state
    const input = checkbox.querySelector('input');
    if (input.checked) {
      checkbox.classList.add('selected');
    }
  });
}

// Privacy Toggles
function initializePrivacyToggles() {
  const toggles = document.querySelectorAll('.toggle-switch input');
  
  toggles.forEach(toggle => {
    toggle.addEventListener('change', function() {
      // Animate the toggle
      const slider = this.nextElementSibling;
      if (this.checked) {
        slider.style.background = 'var(--primary)';
      } else {
        slider.style.background = 'rgba(255, 255, 255, 0.1)';
      }
    });
  });
}

// Modal Management
function initializeModal() {
  // Close modal on overlay click
  const modalOverlay = document.querySelector('.modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === this) {
        closePasswordModal();
      }
    });
  }
  
  // Password form submission
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
      }
      
      // Simulate password change
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Updating...';
      submitBtn.disabled = true;
      
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        closePasswordModal();
        showMessage('Password updated successfully!', 'success');
      }, 1500);
    });
  }
}

// Social Links
window.clearSocialField = function(button) {
  const input = button.parentElement.querySelector('input');
  input.value = '';
  markUnsaved();
};

window.addCustomSocialLink = function() {
  const socialLinks = document.querySelector('.social-links');
  const newLink = document.createElement('div');
  newLink.className = 'social-link-item';
  newLink.innerHTML = `
    <div class="social-icon custom">🔗</div>
    <div class="social-input">
      <label>Custom Link</label>
      <input type="url" placeholder="https://your-link.com">
    </div>
    <button type="button" class="remove-social-btn" onclick="removeSocialLink(this)">×</button>
  `;
  socialLinks.appendChild(newLink);
  
  // Add event listener to new input
  newLink.querySelector('input').addEventListener('change', markUnsaved);
  
  // Animate in
  newLink.style.opacity = '0';
  newLink.style.transform = 'translateY(-10px)';
  setTimeout(() => {
    newLink.style.transition = 'all 0.3s ease';
    newLink.style.opacity = '1';
    newLink.style.transform = 'translateY(0)';
  }, 10);
};

window.removeSocialLink = function(button) {
  const linkItem = button.parentElement;
  linkItem.style.transition = 'all 0.3s ease';
  linkItem.style.opacity = '0';
  linkItem.style.transform = 'translateX(20px)';
  
  setTimeout(() => {
    linkItem.remove();
    markUnsaved();
  }, 300);
};

// Message System
function showMessage(text, type = 'success') {
  const messageContainer = document.getElementById('messageContainer');
  
  // Create message element
  const message = document.createElement('div');
  message.className = `message ${type}`;
  message.innerHTML = `
    <span class="message-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span class="message-text">${text}</span>
    <button class="message-close" onclick="hideMessage()">&times;</button>
  `;
  
  // Clear existing messages
  messageContainer.innerHTML = '';
  messageContainer.appendChild(message);
  messageContainer.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(hideMessage, 5000);
}

window.hideMessage = function() {
  const messageContainer = document.getElementById('messageContainer');
  messageContainer.style.opacity = '0';
  messageContainer.style.transform = 'translateX(100%)';
  
  setTimeout(() => {
    messageContainer.style.display = 'none';
    messageContainer.style.opacity = '1';
    messageContainer.style.transform = 'translateX(0)';
  }, 300);
};

// Modal Functions
window.openPasswordModal = function() {
  document.getElementById('passwordModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closePasswordModal = function() {
  document.getElementById('passwordModal').style.display = 'none';
  document.body.style.overflow = '';
  document.getElementById('passwordForm').reset();
  document.getElementById('passwordStrength').innerHTML = '';
};

// Form Actions
window.resetForm = function() {
  if (confirm('Are you sure you want to reset all changes? This cannot be undone.')) {
    document.getElementById('editProfileForm').reset();
    
    // Reset avatar and banner
    document.getElementById('currentAvatar').src = '/assets/images/nerd_blank_profile.png';
    document.getElementById('currentBanner').src = '/assets/images/profile-banner.jpg';
    
    // Reset character counter
    initializeCharacterCounter();
    
    // Clear unsaved state
    markSaved();
    
    showMessage('Form reset to saved values', 'info');
  }
};

// Account Actions
window.confirmDeactivate = function() {
  if (confirm('Are you sure you want to deactivate your account? You can reactivate it anytime by logging in.')) {
    // Show loading state
    showMessage('Deactivating account...', 'info');
    
    // Simulate API call
    setTimeout(() => {
      showMessage('Account deactivated. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }, 1500);
  }
};

window.confirmDelete = function() {
  const confirmation = prompt('This will permanently delete your account and all data. Type "DELETE" to confirm:');
  if (confirmation === 'DELETE') {
    // Show loading state
    showMessage('Deleting account...', 'info');
    
    // Simulate API call
    setTimeout(() => {
      showMessage('Account deleted. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }, 1500);
  }
};

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    document.getElementById('editProfileForm').dispatchEvent(new Event('submit'));
  }
  
  // Escape to close modal
  if (e.key === 'Escape') {
    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal && passwordModal.style.display === 'flex') {
      closePasswordModal();
    }
  }
});