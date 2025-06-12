// events-details-page.js
document.addEventListener('DOMContentLoaded', function() {
    // Register button functionality
    const registerButton = document.querySelector('.events-details-page-register-button');
    if (registerButton) {
        registerButton.addEventListener('click', function() {
            if (!this.disabled) {
                console.log('Registering for event...');
                // Add registration logic here
                
                // Simulate registration success
                this.textContent = 'Registered!';
                this.disabled = true;
            }
        });
    }

    // Contact organizer button
    const contactButton = document.querySelector('.events-details-page-contact-button');
    if (contactButton) {
        contactButton.addEventListener('click', function() {
            console.log('Contacting organizer...');
            // Add contact modal or redirect logic here
        });
    }

    // Share buttons
    const shareButtons = document.querySelectorAll('.events-details-page-share-button');
    shareButtons.forEach(button => {
        button.addEventListener('click', function() {
            const platform = this.getAttribute('data-platform');
            console.log('Sharing on:', platform);
            
            // Get current URL
            const url = window.location.href;
            const title = document.querySelector('.events-details-page-title').textContent;
            
            // Share logic based on platform
            switch(platform) {
                case 'facebook':
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                    break;
                case 'twitter':
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
                    break;
                case 'copy':
                    navigator.clipboard.writeText(url).then(() => {
                        // Show success message
                        const originalText = this.textContent;
                        this.textContent = 'Copied!';
                        setTimeout(() => {
                            this.textContent = originalText;
                        }, 2000);
                    });
                    break;
            }
        });
    });

    // View participant profiles
    const participants = document.querySelectorAll('.events-details-page-participant');
    participants.forEach(participant => {
        participant.addEventListener('click', function() {
            const participantName = this.querySelector('.events-details-page-participant-name').textContent;
            console.log('Viewing profile:', participantName);
            // Add navigation to participant profile
        });
    });

    // Initialize map (placeholder)
    const mapElement = document.querySelector('.events-details-page-map');
    if (mapElement) {
        console.log('Map would be initialized here');
        // Add actual map initialization (e.g., Google Maps, Mapbox)
    }
});