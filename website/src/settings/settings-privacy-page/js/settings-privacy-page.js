// Settings Privacy Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Privacy zone removal
    document.querySelectorAll('.settings-privacy-page-zone-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Remove this privacy zone?')) {
                this.closest('.settings-privacy-page-zone-item').remove();
            }
        });
    });

    // Unblock user
    document.querySelectorAll('.settings-privacy-page-unblock-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Unblock this user?')) {
                this.closest('.settings-privacy-page-user-item').remove();
            }
        });
    });

    // Data actions
    document.querySelectorAll('.settings-privacy-page-data-action').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.textContent;
            if (this.classList.contains('settings-privacy-page-danger')) {
                if (confirm(`Are you sure you want to ${action.toLowerCase()}? This cannot be undone.`)) {
                    alert(`${action} request submitted`);
                }
            } else {
                alert(`${action} request submitted`);
            }
        });
    });
});