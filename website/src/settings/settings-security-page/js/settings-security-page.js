// settings-security-page.js
document.addEventListener('DOMContentLoaded', function() {
    // Password strength checker
    const passwordInput = document.getElementById('new-password');
    const strengthBar = document.querySelector('.settings-security-page-strength-fill');
    const strengthLabel = document.querySelector('.settings-security-page-strength-label');
    
    if (passwordInput && strengthBar && strengthLabel) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            // Update strength bar
            strengthBar.className = 'settings-security-page-strength-fill';
            
            if (strength >= 80) {
                strengthBar.classList.add('settings-security-page-strength-strong');
                strengthLabel.textContent = 'Strong';
                strengthLabel.style.color = '#10b981';
            } else if (strength >= 50) {
                strengthBar.classList.add('settings-security-page-strength-medium');
                strengthLabel.textContent = 'Medium';
                strengthLabel.style.color = '#f59e0b';
            } else {
                strengthBar.classList.add('settings-security-page-strength-weak');
                strengthLabel.textContent = 'Weak';
                strengthLabel.style.color = '#ef4444';
            }
        });
    }
    
    // Calculate password strength
    function calculatePasswordStrength(password) {
        let strength = 0;
        
        // Length
        if (password.length >= 8) strength += 20;
        if (password.length >= 12) strength += 20;
        
        // Character variety
        if (/[a-z]/.test(password)) strength += 15;
        if (/[A-Z]/.test(password)) strength += 15;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^A-Za-z0-9]/.test(password)) strength += 15;
        
        return strength;
    }
    
    // 2FA toggle
    const enable2FAButton = document.querySelector('[data-action="enable-2fa"]');
    const disable2FAButton = document.querySelector('[data-action="disable-2fa"]');
    const qrSection = document.querySelector('.settings-security-page-qr-section');
    
    if (enable2FAButton) {
        enable2FAButton.addEventListener('click', function() {
            if (qrSection) {
                qrSection.style.display = 'block';
                this.style.display = 'none';
            }
        });
    }
    
    if (disable2FAButton) {
        disable2FAButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to disable two-factor authentication?')) {
                console.log('Disabling 2FA...');
                // Add disable logic here
            }
        });
    }
    
    // Copy backup codes
    const copyCodesButton = document.querySelector('[data-action="copy-codes"]');
    if (copyCodesButton) {
        copyCodesButton.addEventListener('click', function() {
            const codes = Array.from(document.querySelectorAll('.settings-security-page-code'))
                .map(code => code.textContent)
                .join('\n');
            
            navigator.clipboard.writeText(codes).then(() => {
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                setTimeout(() => {
                    this.textContent = originalText;
                }, 2000);
            });
        });
    }
    
    // Revoke session
    const revokeButtons = document.querySelectorAll('[data-action="revoke-session"]');
    revokeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sessionId = this.getAttribute('data-session-id');
            if (confirm('Are you sure you want to revoke this session?')) {
                console.log('Revoking session:', sessionId);
                // Add revoke logic here
                
                // Remove the session from UI
                const sessionElement = this.closest('.settings-security-page-session');
                sessionElement.style.opacity = '0.5';
                setTimeout(() => {
                    sessionElement.remove();
                }, 300);
            }
        });
    });
    
    // Password form submission
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validation
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }
            
            if (newPassword.length < 8) {
                alert('Password must be at least 8 characters long!');
                return;
            }
            
            console.log('Updating password...');
            // Add password update logic here
            
            // Show success message
            showAlert('Password updated successfully!', 'success');
            
            // Clear form
            this.reset();
        });
    }
    
    // Helper function to show alerts
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `settings-security-page-alert settings-security-page-alert-${type}`;
        alertDiv.textContent = message;
        
        const container = document.querySelector('.settings-security-page-container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
});