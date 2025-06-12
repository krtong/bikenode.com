// Settings Email Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Auto-save preferences
    function settingsEmailPageSavePreference(setting, value) {
        console.log(`Saving ${setting}: ${value}`);
        
        // Show notification
        const notification = document.getElementById('settingsEmailPageSaveNotification');
        notification.classList.add('settings-email-page-show');
        
        setTimeout(() => {
            notification.classList.remove('settings-email-page-show');
        }, 3000);
    }

    // Handle select changes
    document.querySelectorAll('.settings-email-page-frequency-select').forEach(select => {
        select.addEventListener('change', (e) => {
            settingsEmailPageSavePreference(e.target.dataset.setting, e.target.value);
        });
    });

    // Handle toggle switches
    document.querySelectorAll('input[type="checkbox"][data-setting]').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            settingsEmailPageSavePreference(e.target.dataset.setting, e.target.checked);
            
            // Handle unsubscribe all
            if (e.target.dataset.setting === 'unsubscribe-all' && e.target.checked) {
                document.querySelectorAll('input[type="checkbox"]:not([data-setting="unsubscribe-all"])').forEach(t => {
                    t.checked = false;
                    t.disabled = true;
                });
                document.querySelectorAll('.settings-email-page-frequency-select').forEach(s => {
                    s.value = 'disabled';
                    s.disabled = true;
                });
            } else if (e.target.dataset.setting === 'unsubscribe-all' && !e.target.checked) {
                document.querySelectorAll('input[type="checkbox"], .settings-email-page-frequency-select').forEach(el => {
                    el.disabled = false;
                });
            }
        });
    });

    // Test email button
    const testEmailBtn = document.querySelector('.settings-email-page-test-email-btn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', () => {
            alert('Test email sent to user@example.com');
        });
    }
});