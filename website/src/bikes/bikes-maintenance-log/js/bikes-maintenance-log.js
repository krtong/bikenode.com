// Bikes Maintenance Log JavaScript

// Modal functions
function addMaintenanceRecord() {
    document.getElementById('add-record-modal').style.display = 'flex';
    document.getElementById('service-date').value = new Date().toISOString().split('T')[0];
}

function closeModal() {
    document.getElementById('add-record-modal').style.display = 'none';
    document.getElementById('maintenance-form').reset();
}

// Form submission
document.getElementById('maintenance-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = {
        type: document.getElementById('service-type').value,
        date: document.getElementById('service-date').value,
        mileage: document.getElementById('service-mileage').value,
        cost: document.getElementById('service-cost').value,
        title: document.getElementById('service-title').value,
        location: document.getElementById('service-location').value,
        description: document.getElementById('service-description').value
    };
    
    console.log('Adding maintenance record:', formData);
    closeModal();
    alert('Maintenance record added successfully!');
});

// Record actions
function editRecord(id) {
    console.log('Editing record:', id);
    alert('Edit functionality would open here!');
}

function duplicateRecord(id) {
    console.log('Duplicating record:', id);
    alert('Record duplicated!');
}

function deleteRecord(id) {
    if (confirm('Are you sure you want to delete this maintenance record?')) {
        console.log('Deleting record:', id);
        alert('Record deleted!');
    }
}

// Service completion
function completeService(type) {
    console.log('Completing service:', type);
    addMaintenanceRecord();
}

function snoozeReminder(type) {
    console.log('Snoozing reminder:', type);
    alert('Reminder snoozed for 1 week');
}

// Other functions
function scheduleReminder() {
    alert('Reminder scheduling feature would open here!');
}

function exportRecords() {
    alert('Exporting maintenance records...');
}

// Search and filter
document.getElementById('maintenance-search').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    console.log('Searching maintenance records:', searchTerm);
});

document.getElementById('type-filter').addEventListener('change', function(e) {
    console.log('Filtering by type:', e.target.value);
});

document.getElementById('year-filter').addEventListener('change', function(e) {
    console.log('Filtering by year:', e.target.value);
});

// Close modal on outside click
document.getElementById('add-record-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});