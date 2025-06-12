// marketplace-item-details.js
document.addEventListener('DOMContentLoaded', function() {
    // Image gallery functionality
    const thumbnails = document.querySelectorAll('.marketplace-item-details-thumbnail');
    const mainImage = document.querySelector('.marketplace-item-details-main-image');
    
    thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', function() {
            console.log('Switching to image', index);
            // Add image switching logic here
        });
    });

    // Contact seller button
    const contactButton = document.querySelector('.marketplace-item-details-button-primary');
    if (contactButton) {
        contactButton.addEventListener('click', function() {
            console.log('Contact seller clicked');
            // Add contact modal or redirect logic here
        });
    }

    // Save listing button
    const saveButton = document.querySelector('.marketplace-item-details-button-secondary');
    if (saveButton) {
        saveButton.addEventListener('click', function() {
            console.log('Save listing clicked');
            // Add save functionality here
        });
    }

    // View seller profile
    const sellerName = document.querySelector('.marketplace-item-details-seller-name');
    if (sellerName) {
        sellerName.addEventListener('click', function() {
            console.log('View seller profile');
            // Add navigation to seller profile
        });
    }
});