// View mode toggle
const viewModes = document.querySelectorAll('.view-mode');
const listView = document.getElementById('listView');
const mapView = document.getElementById('mapView');

viewModes.forEach(mode => {
    mode.addEventListener('click', function() {
        viewModes.forEach(m => m.classList.remove('active'));
        this.classList.add('active');
        
        if (this.dataset.view === 'map') {
            listView.style.display = 'none';
            mapView.style.display = 'block';
        } else {
            listView.style.display = 'block';
            mapView.style.display = 'none';
        }
    });
});

// Filter tabs
const filterTabs = document.querySelectorAll('.filter-tab');
filterTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        filterTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // In a real app, this would filter the events
        console.log('Filtering by:', this.dataset.filter);
    });
});

// Date filter
const dateOptions = document.querySelectorAll('.date-option');
dateOptions.forEach(option => {
    option.addEventListener('click', function() {
        dateOptions.forEach(o => o.classList.remove('active'));
        this.classList.add('active');
    });
});

// Join/RSVP buttons
document.querySelectorAll('.join-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (this.textContent === 'Join' || this.textContent === 'RSVP') {
            this.textContent = 'Joined';
            this.style.background = '#10b981';
        } else if (this.textContent === 'Joined') {
            this.textContent = this.parentElement.parentElement.querySelector('.event-price') ? 'Register' : 'Join';
            this.style.background = '';
        }
    });
});

// Load more
document.querySelector('.load-more').addEventListener('click', function() {
    this.textContent = 'Loading...';
    // Simulate loading
    setTimeout(() => {
        this.textContent = 'Load More Events';
    }, 1000);
});