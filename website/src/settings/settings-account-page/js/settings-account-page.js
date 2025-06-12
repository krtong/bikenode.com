// Settings Account Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    document.querySelectorAll('.settings-account-page-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Remove active class from all tabs and content
            document.querySelectorAll('.settings-account-page-tab-btn').forEach(b => b.classList.remove('settings-account-page-active'));
            document.querySelectorAll('.settings-account-page-tab-content').forEach(c => c.classList.remove('settings-account-page-active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('settings-account-page-active');
            document.getElementById(`settings-account-page-${tabId}`).classList.add('settings-account-page-active');
        });
    });
    
    // Form save functionality
    document.querySelectorAll('.settings-account-page-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.BN-Global-btn-primary');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                submitBtn.textContent = 'Saved!';
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }, 1500);
            }, 1000);
        });
    });
    
    // Connected service toggles
    document.querySelectorAll('.settings-account-page-service-toggle input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            const service = this.closest('.settings-account-page-service-item');
            const status = service.querySelector('.settings-account-page-service-status');
            
            if (this.checked) {
                status.textContent = 'Connected';
                status.className = 'settings-account-page-service-status settings-account-page-connected';
            } else {
                status.textContent = 'Disconnected';
                status.className = 'settings-account-page-service-status settings-account-page-disconnected';
            }
        });
    });
});