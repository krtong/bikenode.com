// Waypoint utilities

export function updateWaypointList(routePlanner) {
    const waypointList = document.getElementById('waypointList');
    const waypointListSection = document.getElementById('waypointListSection');
    
    if (!waypointList) return;
    
    // Show/hide waypoint list section based on waypoints
    if (waypointListSection) {
        waypointListSection.style.display = routePlanner.waypoints.length > 0 ? 'block' : 'none';
    }
    
    if (routePlanner.waypoints.length === 0) {
        waypointList.innerHTML = '<p class="no-waypoints">No waypoints added yet</p>';
        return;
    }
    
    waypointList.innerHTML = routePlanner.waypoints.map((marker, index) => {
        const letter = String.fromCharCode(65 + index);
        const latlng = marker.getLatLng();
        
        return `
            <div class="waypoint-item" draggable="true" data-index="${index}">
                <div class="waypoint-drag-handle">⋮⋮</div>
                <div class="waypoint-marker-icon">${letter}</div>
                <div class="waypoint-details">
                    <div class="waypoint-address">Waypoint ${letter}</div>
                    <div class="waypoint-coords">${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}</div>
                </div>
                <div class="waypoint-actions">
                    <button class="waypoint-action-btn remove" onclick="window.routePlanner.removeWaypoint(${index})" title="Remove waypoint">
                        ×
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add drag and drop functionality
    setupDragAndDrop(routePlanner, waypointList);
}

function setupDragAndDrop(routePlanner, waypointList) {
    let draggedElement = null;
    let draggedIndex = null;
    
    waypointList.querySelectorAll('.waypoint-item').forEach((item, index) => {
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            draggedIndex = index;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = getDragAfterElement(waypointList, e.clientY);
            if (afterElement == null) {
                waypointList.appendChild(draggedElement);
            } else {
                waypointList.insertBefore(draggedElement, afterElement);
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropIndex = [...waypointList.children].indexOf(item);
            
            if (draggedIndex !== dropIndex) {
                // Reorder waypoints array
                const [removed] = routePlanner.waypoints.splice(draggedIndex, 1);
                routePlanner.waypoints.splice(dropIndex, 0, removed);
                
                // Re-label markers
                routePlanner.waypoints.forEach((marker, i) => {
                    const letter = String.fromCharCode(65 + i);
                    marker._icon.querySelector('.waypoint-marker-custom').textContent = letter;
                });
                
                // Update route
                routePlanner.updateRoute();
                
                // Refresh list
                updateWaypointList(routePlanner);
            }
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.waypoint-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}