// discord-bot-setup.js
document.addEventListener('DOMContentLoaded', function() {
    let currentStep = 1;
    const totalSteps = 3;
    
    // Server selection
    const serverCards = document.querySelectorAll('.discord-bot-setup-server');
    let selectedServer = null;
    
    serverCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            serverCards.forEach(c => c.classList.remove('discord-bot-setup-server-selected'));
            
            // Add selected class to clicked card
            this.classList.add('discord-bot-setup-server-selected');
            
            // Store selected server
            selectedServer = this.getAttribute('data-server-id');
            console.log('Selected server:', selectedServer);
            
            // Enable next button
            updateNextButton();
        });
    });
    
    // Toggle switches
    const toggles = document.querySelectorAll('.discord-bot-setup-toggle input');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const optionName = this.getAttribute('data-option');
            console.log(`${optionName}: ${this.checked}`);
            
            // Show/hide channel selection based on toggle
            if (optionName === 'welcome-messages') {
                const channelSection = document.querySelector('.discord-bot-setup-channels');
                if (channelSection) {
                    channelSection.style.display = this.checked ? 'block' : 'none';
                }
            }
        });
    });
    
    // Step navigation
    const nextButton = document.querySelector('[data-action="next"]');
    const prevButton = document.querySelector('[data-action="previous"]');
    const completeButton = document.querySelector('[data-action="complete"]');
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (currentStep < totalSteps) {
                moveToStep(currentStep + 1);
            }
        });
    }
    
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (currentStep > 1) {
                moveToStep(currentStep - 1);
            }
        });
    }
    
    if (completeButton) {
        completeButton.addEventListener('click', function() {
            completeSetup();
        });
    }
    
    // Move to step function
    function moveToStep(step) {
        // Hide current section
        document.querySelector(`[data-step="${currentStep}"]`).style.display = 'none';
        
        // Show new section
        document.querySelector(`[data-step="${step}"]`).style.display = 'block';
        
        // Update progress
        updateProgress(step);
        
        // Update current step
        currentStep = step;
        
        // Update navigation buttons
        updateNavigationButtons();
    }
    
    // Update progress indicator
    function updateProgress(step) {
        const steps = document.querySelectorAll('.discord-bot-setup-step');
        
        steps.forEach((s, index) => {
            if (index < step - 1) {
                s.classList.add('discord-bot-setup-step-completed');
                s.classList.remove('discord-bot-setup-step-active');
            } else if (index === step - 1) {
                s.classList.add('discord-bot-setup-step-active');
                s.classList.remove('discord-bot-setup-step-completed');
            } else {
                s.classList.remove('discord-bot-setup-step-active', 'discord-bot-setup-step-completed');
            }
        });
    }
    
    // Update navigation buttons
    function updateNavigationButtons() {
        if (prevButton) {
            prevButton.style.display = currentStep === 1 ? 'none' : 'block';
        }
        
        if (nextButton) {
            nextButton.style.display = currentStep === totalSteps ? 'none' : 'block';
        }
        
        if (completeButton) {
            completeButton.style.display = currentStep === totalSteps ? 'block' : 'none';
        }
    }
    
    // Update next button state
    function updateNextButton() {
        if (nextButton) {
            if (currentStep === 1 && !selectedServer) {
                nextButton.disabled = true;
            } else {
                nextButton.disabled = false;
            }
        }
    }
    
    // Complete setup
    function completeSetup() {
        // Gather all settings
        const settings = {
            server: selectedServer,
            options: {}
        };
        
        toggles.forEach(toggle => {
            settings.options[toggle.getAttribute('data-option')] = toggle.checked;
        });
        
        // Get channel selections
        const channelSelects = document.querySelectorAll('.discord-bot-setup-channel-select');
        channelSelects.forEach(select => {
            settings.options[select.getAttribute('data-channel')] = select.value;
        });
        
        console.log('Setup complete with settings:', settings);
        
        // Show success message
        showSuccessMessage();
    }
    
    // Show success message
    function showSuccessMessage() {
        // Hide all sections
        document.querySelectorAll('[data-step]').forEach(section => {
            section.style.display = 'none';
        });
        
        // Hide navigation
        document.querySelector('.discord-bot-setup-actions').style.display = 'none';
        
        // Show success
        const successSection = document.querySelector('.discord-bot-setup-success');
        if (successSection) {
            successSection.style.display = 'block';
        }
    }
    
    // Initialize
    updateNavigationButtons();
    updateNextButton();
});