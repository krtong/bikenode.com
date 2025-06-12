// Rides Details Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize rides details page functionality
    ridesDetailsPageInit();
});

function ridesDetailsPageInit() {
    // Initialize map
    ridesDetailsPageInitMap();
    
    // Initialize elevation chart
    ridesDetailsPageInitElevationChart();
    
    // Initialize photo gallery
    ridesDetailsPageInitPhotoGallery();
    
    // Initialize social actions
    ridesDetailsPageInitSocialActions();
    
    // Initialize edit notes
    ridesDetailsPageInitEditNotes();
    
    // Initialize more menu
    ridesDetailsPageInitMoreMenu();
}

// Map Initialization
function ridesDetailsPageInitMap() {
    const mapElement = document.getElementById('rides-details-page-map');
    
    if (mapElement) {
        // In a real implementation, this would initialize a map library (Mapbox, Leaflet, etc.)
        console.log('Initializing ride map');
        
        // Remove placeholder
        const placeholder = mapElement.querySelector('.rides-details-page-map-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Simulate map loading
        setTimeout(() => {
            mapElement.style.background = 'url("/assets/images/map-placeholder.jpg") center/cover';
        }, 1000);
    }
}

// Elevation Chart
function ridesDetailsPageInitElevationChart() {
    const chartElement = document.getElementById('rides-details-page-elevation');
    
    if (chartElement) {
        const canvas = chartElement.querySelector('canvas');
        
        if (canvas) {
            // In a real implementation, this would use Chart.js or similar
            console.log('Initializing elevation chart');
            
            // Simple placeholder drawing
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // Draw simple elevation profile
            ctx.strokeStyle = 'rgba(88, 101, 242, 0.8)';
            ctx.fillStyle = 'rgba(88, 101, 242, 0.1)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - 20);
            
            // Generate random elevation points
            for (let i = 0; i <= canvas.width; i += 20) {
                const height = Math.random() * (canvas.height - 40) + 20;
                ctx.lineTo(i, height);
            }
            
            ctx.lineTo(canvas.width, canvas.height - 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
    }
}

// Photo Gallery
function ridesDetailsPageInitPhotoGallery() {
    const photos = document.querySelectorAll('.rides-details-page-photo');
    const addPhotoBtn = document.querySelector('.rides-details-page-add-photo');
    
    // Photo click handler
    photos.forEach(photo => {
        photo.addEventListener('click', function() {
            ridesDetailsPageOpenPhotoViewer(this);
        });
    });
    
    // Add photo handler
    if (addPhotoBtn) {
        addPhotoBtn.addEventListener('click', function() {
            ridesDetailsPageOpenPhotoUploader();
        });
    }
}

function ridesDetailsPageOpenPhotoViewer(photoElement) {
    console.log('Opening photo viewer');
    // In a real implementation, this would open a lightbox/modal
}

function ridesDetailsPageOpenPhotoUploader() {
    console.log('Opening photo uploader');
    // In a real implementation, this would open a file picker
    
    // Simulate file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        console.log('Selected files:', files);
        // Handle file upload
    });
    
    input.click();
}

// Social Actions
function ridesDetailsPageInitSocialActions() {
    const socialButtons = document.querySelectorAll('.rides-details-page-social-button');
    
    socialButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.querySelector('span').textContent.toLowerCase();
            
            if (action.includes('kudos')) {
                ridesDetailsPageToggleKudos(this);
            } else if (action.includes('comments')) {
                ridesDetailsPageShowComments();
            }
        });
    });
}

function ridesDetailsPageToggleKudos(button) {
    const kudosCount = button.querySelector('span');
    const currentCount = parseInt(kudosCount.textContent.match(/\d+/)[0]);
    const isActive = button.classList.contains('active');
    
    if (isActive) {
        kudosCount.textContent = `${currentCount - 1} Kudos`;
        button.classList.remove('active');
    } else {
        kudosCount.textContent = `${currentCount + 1} Kudos`;
        button.classList.add('active');
    }
    
    // In a real implementation, this would make an API call
    console.log('Toggling kudos');
}

function ridesDetailsPageShowComments() {
    console.log('Showing comments section');
    // In a real implementation, this would expand/show comments section
}

// Edit Notes
function ridesDetailsPageInitEditNotes() {
    const editNotesBtn = document.querySelector('.rides-details-page-edit-notes');
    
    if (editNotesBtn) {
        editNotesBtn.addEventListener('click', function() {
            ridesDetailsPageEditNotes();
        });
    }
}

function ridesDetailsPageEditNotes() {
    const notesContent = document.querySelector('.rides-details-page-notes-content');
    const editBtn = document.querySelector('.rides-details-page-edit-notes');
    
    if (notesContent && editBtn) {
        const currentText = notesContent.querySelector('p').textContent;
        
        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.className = 'rides-details-page-notes-textarea';
        textarea.value = currentText;
        textarea.style.width = '100%';
        textarea.style.minHeight = '100px';
        textarea.style.padding = '0.75rem';
        textarea.style.background = 'rgba(255, 255, 255, 0.05)';
        textarea.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        textarea.style.borderRadius = '6px';
        textarea.style.color = 'var(--text-primary)';
        textarea.style.fontSize = '0.875rem';
        textarea.style.lineHeight = '1.6';
        textarea.style.marginBottom = '1rem';
        
        // Replace content with textarea
        notesContent.innerHTML = '';
        notesContent.appendChild(textarea);
        
        // Change button to save
        editBtn.textContent = 'Save Notes';
        editBtn.onclick = function() {
            ridesDetailsPageSaveNotes(textarea.value);
        };
        
        // Focus textarea
        textarea.focus();
    }
}

function ridesDetailsPageSaveNotes(newText) {
    const notesContent = document.querySelector('.rides-details-page-notes-content');
    const editBtn = document.querySelector('.rides-details-page-edit-notes');
    
    if (notesContent && editBtn) {
        // Create paragraph with new text
        const p = document.createElement('p');
        p.textContent = newText;
        
        // Replace textarea with paragraph
        notesContent.innerHTML = '';
        notesContent.appendChild(p);
        
        // Reset button
        editBtn.textContent = 'Edit Notes';
        editBtn.onclick = function() {
            ridesDetailsPageEditNotes();
        };
        
        // In a real implementation, this would save to API
        console.log('Saving notes:', newText);
    }
}

// More Menu
function ridesDetailsPageInitMoreMenu() {
    const moreButton = document.querySelector('.rides-details-page-more-button');
    
    if (moreButton) {
        moreButton.addEventListener('click', function(e) {
            e.stopPropagation();
            ridesDetailsPageToggleMoreMenu(this);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            ridesDetailsPageCloseMoreMenu();
        });
    }
}

function ridesDetailsPageToggleMoreMenu(button) {
    const existingMenu = document.querySelector('.rides-details-page-more-menu');
    
    if (existingMenu) {
        existingMenu.remove();
    } else {
        // Create menu
        const menu = document.createElement('div');
        menu.className = 'rides-details-page-more-menu';
        menu.style.position = 'absolute';
        menu.style.top = button.offsetTop + button.offsetHeight + 5 + 'px';
        menu.style.right = '0';
        menu.style.background = 'var(--bg-secondary)';
        menu.style.border = '1px solid var(--glass-border)';
        menu.style.borderRadius = '8px';
        menu.style.padding = '0.5rem';
        menu.style.minWidth = '180px';
        menu.style.zIndex = '100';
        
        const menuItems = [
            { text: 'Export GPX', icon: '📤' },
            { text: 'Duplicate Activity', icon: '📋' },
            { text: 'Make Private', icon: '🔒' },
            { text: 'Delete Activity', icon: '🗑️', danger: true }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('button');
            menuItem.className = 'rides-details-page-menu-item';
            menuItem.style.display = 'flex';
            menuItem.style.alignItems = 'center';
            menuItem.style.gap = '0.5rem';
            menuItem.style.width = '100%';
            menuItem.style.padding = '0.5rem 0.75rem';
            menuItem.style.background = 'transparent';
            menuItem.style.border = 'none';
            menuItem.style.color = item.danger ? '#ef4444' : 'var(--text-primary)';
            menuItem.style.fontSize = '0.875rem';
            menuItem.style.cursor = 'pointer';
            menuItem.style.borderRadius = '6px';
            menuItem.style.textAlign = 'left';
            
            menuItem.innerHTML = `<span>${item.icon}</span> ${item.text}`;
            
            menuItem.addEventListener('click', function() {
                ridesDetailsPageHandleMenuAction(item.text);
            });
            
            menuItem.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            
            menuItem.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
            });
            
            menu.appendChild(menuItem);
        });
        
        button.parentElement.style.position = 'relative';
        button.parentElement.appendChild(menu);
    }
}

function ridesDetailsPageCloseMoreMenu() {
    const menu = document.querySelector('.rides-details-page-more-menu');
    if (menu) {
        menu.remove();
    }
}

function ridesDetailsPageHandleMenuAction(action) {
    console.log('Menu action:', action);
    ridesDetailsPageCloseMoreMenu();
    
    // In a real implementation, handle each action
    switch(action) {
        case 'Export GPX':
            console.log('Exporting GPX file');
            break;
        case 'Duplicate Activity':
            console.log('Duplicating activity');
            break;
        case 'Make Private':
            console.log('Making activity private');
            break;
        case 'Delete Activity':
            if (confirm('Are you sure you want to delete this activity?')) {
                console.log('Deleting activity');
            }
            break;
    }
}