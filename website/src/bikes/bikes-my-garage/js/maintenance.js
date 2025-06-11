/**
 * Maintenance schedule management
 * Uses global CSS badge and list components
 */

export async function loadMaintenanceTasks(apiBase) {
    try {
        const response = await fetch(`${apiBase}/user/maintenance`);
        if (response.ok) {
            return await response.json();
        }
        throw new Error('Failed to load maintenance tasks');
    } catch (error) {
        console.error('Error loading maintenance tasks:', error);
        return [];
    }
}

export function renderMaintenanceTask(task) {
    const statusClass = getMaintenanceStatusClass(task.status);
    const dueDate = new Date(task.dueDate).toLocaleDateString();
    const statusBadge = getStatusBadge(task.status);
    
    return `
        <div class="list-item maintenance-item ${statusClass}" data-status="${task.status}">
            <div class="flex-between">
                <div>
                    <h4 class="font-medium mb-1">${task.title}</h4>
                    <p class="text-secondary font-sm mb-2">${task.bike} • ${task.type}</p>
                    <div class="d-flex gap-3 font-sm text-secondary">
                        <span>📅 Due: ${dueDate}</span>
                        <span>📏 ${task.mileage} miles</span>
                    </div>
                </div>
                <div class="d-flex flex-column align-items-end gap-2">
                    ${statusBadge}
                    <button class="btn btn-sm btn-secondary" onclick="completeMaintenanceTask(${task.id})">
                        ✓ Mark Complete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getMaintenanceStatusClass(status) {
    const classes = {
        'overdue': 'overdue',
        'due-soon': 'due-soon',
        'upcoming': 'upcoming',
        'completed': 'completed'
    };
    return classes[status] || '';
}

function getStatusBadge(status) {
    const badges = {
        'overdue': '<span class="badge badge-danger">Overdue</span>',
        'due-soon': '<span class="badge badge-warning">Due Soon</span>',
        'upcoming': '<span class="badge badge-success">Upcoming</span>',
        'completed': '<span class="badge badge-secondary">Completed</span>'
    };
    return badges[status] || '';
}

// Global functions
window.openAddMaintenanceModal = function() {
    // Implementation for opening maintenance modal
    console.log('Opening maintenance modal...');
};

window.completeMaintenanceTask = function(taskId) {
    // Implementation for completing a task
    console.log('Completing task:', taskId);
};