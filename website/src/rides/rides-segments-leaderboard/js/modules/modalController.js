// Modal Controller
let createSegmentMap;
let currentStep = 1;

export function initModals() {
    initModalClosing();
    initCreateSegmentModal();
    initSegmentDetailModal();
}

function initModalClosing() {
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.BN-Global-modal');
            closeModal(modal);
        });
    });
    
    // Overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('.BN-Global-modal');
            closeModal(modal);
        });
    });
    
    // ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.BN-Global-modal.active');
            if (activeModal) closeModal(activeModal);
        }
    });
}

function closeModal(modal) {
    modal?.classList.remove('active');
}

function initCreateSegmentModal() {
    const createBtn = document.getElementById('createSegmentBtn');
    const modal = document.getElementById('createSegmentModal');
    
    createBtn?.addEventListener('click', () => {
        modal?.classList.add('active');
        initializeCreateSegmentMap();
        resetCreateSegmentForm();
    });
    
    // Step navigation
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const createSegmentSubmitBtn = document.querySelector('#createSegmentModal #createSegmentBtn');
    
    prevBtn?.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateStepDisplay();
        }
    });
    
    nextBtn?.addEventListener('click', () => {
        if (validateCurrentStep()) {
            if (currentStep < 3) {
                currentStep++;
                updateStepDisplay();
            }
        }
    });
    
    createSegmentSubmitBtn?.addEventListener('click', () => {
        if (validateCurrentStep()) {
            submitNewSegment();
        }
    });
}

function initializeCreateSegmentMap() {
    const mapContainer = document.getElementById('createSegmentMap');
    if (!mapContainer || createSegmentMap) return;
    
    createSegmentMap = L.map('createSegmentMap').setView([37.7749, -122.4194], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(createSegmentMap);
    
    // Add click handler for setting waypoints
    let startMarker, endMarker, routeLine;
    let clickCount = 0;
    
    createSegmentMap.on('click', (e) => {
        if (clickCount === 0) {
            // Set start point
            if (startMarker) createSegmentMap.removeLayer(startMarker);
            startMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'start-marker',
                    html: '<div style="background: #10b981; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>'
                })
            }).addTo(createSegmentMap);
            clickCount = 1;
        } else if (clickCount === 1) {
            // Set end point
            if (endMarker) createSegmentMap.removeLayer(endMarker);
            endMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'end-marker',
                    html: '<div style="background: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>'
                })
            }).addTo(createSegmentMap);
            
            // Draw route
            if (routeLine) createSegmentMap.removeLayer(routeLine);
            routeLine = L.polyline([startMarker.getLatLng(), endMarker.getLatLng()], {
                color: '#5865f2',
                weight: 4,
                opacity: 0.8
            }).addTo(createSegmentMap);
            
            // Update route stats
            updateRouteStats(startMarker.getLatLng(), endMarker.getLatLng());
            
            clickCount = 0;
        }
    });
}

function updateRouteStats(start, end) {
    // Calculate distance (simple approximation)
    const distance = start.distanceTo(end) / 1609.34; // Convert to miles
    document.getElementById('routeDistance').textContent = distance.toFixed(1) + ' mi';
    
    // Mock elevation and grade
    const elevation = Math.floor(Math.random() * 500) + 100;
    document.getElementById('routeElevation').textContent = elevation + ' ft';
    
    const grade = (elevation / (distance * 5280) * 100).toFixed(1);
    document.getElementById('routeGrade').textContent = grade + '%';
}

function resetCreateSegmentForm() {
    currentStep = 1;
    updateStepDisplay();
    document.getElementById('segmentName').value = '';
    document.getElementById('segmentDescription').value = '';
    document.getElementById('segmentType').value = 'auto';
    document.getElementById('segmentSurface').value = 'paved';
    document.querySelector('input[name="visibility"][value="public"]').checked = true;
}

function updateStepDisplay() {
    // Update step indicators
    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum <= currentStep);
    });
    
    // Update step content
    document.querySelectorAll('.step-content').forEach(content => {
        const stepNum = parseInt(content.dataset.step);
        content.classList.toggle('active', stepNum === currentStep);
    });
    
    // Update buttons
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const createBtn = document.querySelector('#createSegmentModal #createSegmentBtn');
    
    prevBtn.style.display = currentStep > 1 ? 'flex' : 'none';
    nextBtn.style.display = currentStep < 3 ? 'flex' : 'none';
    createBtn.style.display = currentStep === 3 ? 'flex' : 'none';
    
    // Update preview if on step 3
    if (currentStep === 3) {
        updatePreview();
    }
}

function validateCurrentStep() {
    switch(currentStep) {
        case 1:
            // Check if route is drawn
            const distance = document.getElementById('routeDistance').textContent;
            if (distance === '0.0 mi') {
                alert('Please draw a route by clicking start and end points on the map');
                return false;
            }
            return true;
            
        case 2:
            // Check form fields
            const name = document.getElementById('segmentName').value.trim();
            if (!name) {
                alert('Please enter a segment name');
                return false;
            }
            return true;
            
        case 3:
            return true;
            
        default:
            return false;
    }
}

function updatePreview() {
    document.getElementById('previewName').textContent = 
        document.getElementById('segmentName').value || 'Unnamed Segment';
    
    document.getElementById('previewDescription').textContent = 
        document.getElementById('segmentDescription').value || 'No description provided';
    
    document.getElementById('previewDistance').textContent = 
        document.getElementById('routeDistance').textContent;
    
    document.getElementById('previewElevation').textContent = 
        document.getElementById('routeElevation').textContent;
    
    document.getElementById('previewGrade').textContent = 
        document.getElementById('routeGrade').textContent;
    
    const typeSelect = document.getElementById('segmentType');
    document.getElementById('previewType').textContent = 
        typeSelect.options[typeSelect.selectedIndex].text;
}

function submitNewSegment() {
    // Gather form data
    const segmentData = {
        name: document.getElementById('segmentName').value,
        description: document.getElementById('segmentDescription').value,
        type: document.getElementById('segmentType').value,
        surface: document.getElementById('segmentSurface').value,
        visibility: document.querySelector('input[name="visibility"]:checked').value,
        distance: document.getElementById('routeDistance').textContent,
        elevation: document.getElementById('routeElevation').textContent,
        grade: document.getElementById('routeGrade').textContent
    };
    
    console.log('Creating segment:', segmentData);
    
    // Would make API call to create segment
    // For now, just close modal and show success
    closeModal(document.getElementById('createSegmentModal'));
    
    // Show success message
    alert('Segment created successfully!');
}

function initSegmentDetailModal() {
    // Share button
    document.getElementById('shareSegmentBtn')?.addEventListener('click', () => {
        console.log('Share segment');
        // Would implement sharing functionality
    });
    
    // Flag button
    document.getElementById('flagSegmentBtn')?.addEventListener('click', () => {
        console.log('Flag segment');
        // Would implement flagging functionality
    });
    
    // View on map button
    document.getElementById('viewOnMapBtn')?.addEventListener('click', () => {
        closeModal(document.getElementById('segmentDetailModal'));
        // Would center main map on segment
    });
}