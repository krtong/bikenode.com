// Action handlers
import { navigationState } from './navigation.js';

export function closeSpecs() {
    document.getElementById('specs-panel').classList.remove('active');
}

export async function addToGarage() {
    const vehicleData = {
        category: navigationState.selectedVehicle.category,
        brand: navigationState.selectedVehicle.brand,
        year: navigationState.selectedVehicle.year,
        model: navigationState.selectedVehicle.model
    };
    
    console.log('Adding to garage:', vehicleData);
    alert('Vehicle added to your garage!');
    window.location.href = '/virtual-garage-dashboard/';
}

export function findComparisons() {
    alert('Opening comparison tool...');
}

export function viewReviews() {
    alert('Loading community reviews...');
}

export function viewGallery() {
    alert('Opening photo gallery...');
}

export function customize() {
    alert('Opening customization options...');
}

// Make functions available globally for onclick handlers
window.closeSpecs = closeSpecs;
window.addToGarage = addToGarage;
window.findComparisons = findComparisons;
window.viewReviews = viewReviews;
window.viewGallery = viewGallery;
window.customize = customize;