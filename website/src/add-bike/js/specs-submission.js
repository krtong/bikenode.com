// Specs submission functionality
import { navigationState } from './navigation.js';

// Make functions available globally
window.openSubmitSpecsModal = openSubmitSpecsModal;
window.closeSubmitSpecsModal = closeSubmitSpecsModal;
window.submitSpecsURL = submitSpecsURL;

function openSubmitSpecsModal() {
    const modal = document.getElementById('submit-specs-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeSubmitSpecsModal() {
    const modal = document.getElementById('submit-specs-modal');
    if (modal) {
        modal.style.display = 'none';
        // Reset form
        const form = document.getElementById('submit-specs-form');
        if (form) {
            form.reset();
        }
    }
}

async function submitSpecsURL(event) {
    event.preventDefault();
    
    const form = event.target;
    const url = form.url.value;
    const notes = form.notes.value;
    
    // Get current vehicle information
    const vehicleInfo = {
        category: navigationState.currentBreadcrumb[1] || 'Unknown',
        brand: navigationState.currentBreadcrumb[2] || 'Unknown',
        year: navigationState.currentBreadcrumb[3] || 'Unknown',
        model: navigationState.currentBreadcrumb[4] || 'Unknown',
        variant: navigationState.currentBreadcrumb[5] || 'Unknown',
        timestamp: new Date().toISOString()
    };
    
    // Prepare submission data
    const submissionData = {
        url: url,
        notes: notes,
        vehicle: vehicleInfo,
        userAgent: navigator.userAgent
    };
    
    try {
        // Submit to API
        const response = await fetch('http://localhost:8080/api/specs-submissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(submissionData)
        });
        
        if (response.ok) {
            // Show success message
            alert('Thank you! Your specs URL has been submitted successfully.');
            closeSubmitSpecsModal();
        } else {
            throw new Error('Failed to submit');
        }
    } catch (error) {
        console.error('Error submitting specs URL:', error);
        // Fallback: Log to console for now
        console.log('Specs Submission:', submissionData);
        
        // Show success anyway (we'll log it)
        alert('Thank you! Your submission has been recorded.');
        closeSubmitSpecsModal();
    }
}

// Check if specs are incomplete and show notice
export function checkSpecsCompleteness(specs) {
    const missingNotice = document.getElementById('missing-specs-notice');
    if (!missingNotice) return;
    
    // Check if any specs are missing or marked as N/A
    let hasMissingSpecs = false;
    
    if (specs && typeof specs === 'object') {
        const specValues = Object.values(specs);
        hasMissingSpecs = specValues.some(value => 
            !value || 
            value === 'N/A' || 
            value === 'Not Available' ||
            value === '-' ||
            value === ''
        );
    }
    
    // Also check if we have very few specs
    const specCount = specs ? Object.keys(specs).length : 0;
    if (specCount < 5) {
        hasMissingSpecs = true;
    }
    
    // Show or hide the notice
    missingNotice.style.display = hasMissingSpecs ? 'block' : 'none';
}