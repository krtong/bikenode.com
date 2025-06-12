// Profile Page JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // Tab Navigation
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');
      
      // Initialize chart when overview tab is activated
      if (targetTab === 'overview') {
        initializeActivityChart();
      }
    });
  });
  
  // Initialize activity chart on page load if overview is active
  if (document.querySelector('.nav-tab[data-tab="overview"]').classList.contains('active')) {
    initializeActivityChart();
  }
  
  // Profile Actions
  document.querySelector('.edit-profile-btn')?.addEventListener('click', () => {
    window.location.href = '/edit-profile/';
  });
  
  document.querySelector('.share-profile-btn')?.addEventListener('click', () => {
    if (navigator.share) {
      navigator.share({
        title: 'Kevin Tong - BikeNode Profile',
        text: 'Check out my BikeNode profile!',
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Profile link copied to clipboard!');
    }
  });
  
  document.querySelector('.add-bike-btn')?.addEventListener('click', () => {
    window.location.href = '/add-bike-v2/';
  });
  
  document.querySelector('.create-post-btn')?.addEventListener('click', () => {
    window.location.href = '/create-post/';
  });
  
  // Garage view toggle functionality
  const garageViewButtons = document.querySelectorAll('.garage-actions .view-btn');
  garageViewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      
      // Update active states
      garageViewButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Toggle views
      const showcaseView = document.getElementById('garageShowcase');
      const gridView = document.getElementById('garageGrid');
      const timelineView = document.getElementById('garageTimeline');
      
      // Hide all views first
      if (showcaseView) showcaseView.style.display = 'none';
      if (gridView) gridView.style.display = 'none';
      if (timelineView) timelineView.style.display = 'none';
      
      // Show selected view
      switch(view) {
        case 'showcase':
          if (showcaseView) showcaseView.style.display = 'block';
          break;
        case 'grid':
          if (gridView) {
            gridView.style.display = 'block';
            // Load grid view content if needed
            loadGarageGridView();
          }
          break;
        case 'timeline':
          if (timelineView) {
            timelineView.style.display = 'block';
            // Load timeline view content if needed
            loadGarageTimelineView();
          }
          break;
      }
    });
  });
  
  // More options menu
  let moreMenuOpen = false;
  document.querySelector('.more-options-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenuOpen = !moreMenuOpen;
    // Would show a dropdown menu here
  });
  
  // Close menu on outside click
  document.addEventListener('click', () => {
    if (moreMenuOpen) {
      moreMenuOpen = false;
      // Hide dropdown menu
    }
  });
  
  // Stat card clicks
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const label = card.querySelector('.stat-label').textContent.toLowerCase();
      
      // Navigate to corresponding tab
      switch(label) {
        case 'bikes':
          switchToTab('garage');
          break;
        case 'rides':
          switchToTab('rides');
          break;
        case 'achievements':
          switchToTab('achievements');
          break;
        case 'followers':
        case 'following':
          window.location.href = '/following/';
          break;
      }
    });
  });
  
  // Helper function to switch tabs
  window.switchToTab = function(tabName) {
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.click();
      }
    });
  };
  
  // Load dynamic content for tabs (placeholder)
  loadGarageData();
  loadKitData();
  loadInventoryData();
  loadRidesData();
  loadAchievementsData();
  loadPostsData();
  loadCommunitiesData();
  loadFriendsData();
});

// Enhanced garage data and functionality
const garageData = {
  bikes: [
    {
      id: 'bike-1',
      year: 2025,
      make: 'Yamaha',
      model: 'YZF-R1',
      type: 'sport',
      image: '/assets/images/bikes/yamaha-r1.jpg',
      nickname: 'Blue Thunder',
      mileage: 3420,
      value: 18999,
      horsepower: 200,
      purchaseDate: '2024-03-15',
      lastService: '2024-11-01',
      nextService: '2025-05-01',
      serviceDue: false,
      isFavorite: true,
      stats: {
        rides: 89,
        miles: 3420,
        avgSpeed: 45,
        topSpeed: 186
      }
    },
    {
      id: 'bike-2',
      year: 2024,
      make: 'Ducati',
      model: 'Panigale V4S',
      type: 'sport',
      image: '/assets/images/bikes/ducati-v4.jpg',
      nickname: 'Italian Stallion',
      mileage: 1850,
      value: 32500,
      horsepower: 214,
      purchaseDate: '2024-06-20',
      lastService: '2024-10-15',
      nextService: '2025-04-15',
      serviceDue: false,
      isFavorite: false,
      stats: {
        rides: 42,
        miles: 1850,
        avgSpeed: 52,
        topSpeed: 199
      }
    },
    {
      id: 'bike-3',
      year: 2023,
      make: 'Honda',
      model: 'CBR1000RR-R Fireblade SP',
      type: 'sport',
      image: '/assets/images/bikes/honda-cbr.jpg',
      nickname: 'Track Weapon',
      mileage: 5230,
      value: 28995,
      horsepower: 217,
      purchaseDate: '2023-02-10',
      lastService: '2024-08-20',
      nextService: '2025-02-20',
      serviceDue: true,
      isFavorite: false,
      stats: {
        rides: 156,
        miles: 5230,
        avgSpeed: 48,
        topSpeed: 195
      }
    },
    {
      id: 'bike-4',
      year: 2022,
      make: 'BMW',
      model: 'R 1250 GS Adventure',
      type: 'adventure',
      image: '/assets/images/bikes/bmw-gs.jpg',
      nickname: 'Globe Trotter',
      mileage: 18500,
      value: 22500,
      horsepower: 136,
      purchaseDate: '2022-05-01',
      lastService: '2024-09-15',
      nextService: '2025-03-15',
      serviceDue: false,
      isFavorite: false,
      stats: {
        rides: 234,
        miles: 18500,
        avgSpeed: 38,
        topSpeed: 125
      }
    }
  ],
  selectedBikes: new Set(),
  currentView: 'grid',
  currentFilter: 'all'
};

function loadGarageData() {
  // The new garage showcase view is already populated with static content
  // This function can be used to add dynamic functionality if needed
  console.log('Garage data loaded');
}

// Simplified garage functions for the static prototype
window.editBike = function(bikeId) {
  console.log('Edit bike:', bikeId);
  window.location.href = `/edit-bike/?id=${bikeId}`;
};

function loadRidesData() {
  const ridesList = document.querySelector('.rides-list');
  if (!ridesList) return;
  
  ridesList.innerHTML = `
    <div class="ride-item">
      <div class="ride-date">Today</div>
      <div class="ride-info">
        <h4>Pacific Coast Highway</h4>
        <p>102.3 miles • 3h 45m • 4,521 ft elevation</p>
      </div>
    </div>
    <div class="ride-item">
      <div class="ride-date">Yesterday</div>
      <div class="ride-info">
        <h4>Skyline Boulevard</h4>
        <p>45.8 miles • 1h 52m • 2,134 ft elevation</p>
      </div>
    </div>
  `;
}

function loadAchievementsData() {
  const achievementsGrid = document.querySelector('.achievements-grid');
  if (!achievementsGrid) return;
  
  const achievements = [
    { icon: '🏆', name: 'Century Rider', desc: 'Complete a 100+ mile ride' },
    { icon: '⛰️', name: 'Mountain Goat', desc: '10,000 ft in one ride' },
    { icon: '🔥', name: 'Speed Demon', desc: 'Average 25+ mph' },
    { icon: '📍', name: 'Explorer', desc: 'Visit 50 unique locations' }
  ];
  
  achievementsGrid.innerHTML = achievements.map(achievement => `
    <div class="achievement-card">
      <div class="achievement-icon">${achievement.icon}</div>
      <h4>${achievement.name}</h4>
      <p>${achievement.desc}</p>
    </div>
  `).join('');
}

function loadPostsData() {
  const postsList = document.querySelector('.posts-list');
  if (!postsList) return;
  
  postsList.innerHTML = `
    <div class="post-item">
      <h4>Track Day Tips for Beginners</h4>
      <p>Essential advice for your first track day experience...</p>
      <div class="post-meta">
        <span>5 days ago</span>
        <span>•</span>
        <span>234 views</span>
        <span>•</span>
        <span>12 comments</span>
      </div>
    </div>
  `;
}

function loadCommunitiesData() {
  const communitiesGrid = document.querySelector('.communities-grid');
  if (!communitiesGrid) return;
  
  communitiesGrid.innerHTML = `
    <div class="community-card">
      <h4>Bay Area Riders</h4>
      <p>1,234 members</p>
    </div>
    <div class="community-card">
      <h4>Track Day Warriors</h4>
      <p>567 members</p>
    </div>
  `;
}

function loadKitData() {
  // Initialize the RPG loadout system
  initializeLoadoutSystem();
}

function initializeLoadoutSystem() {
  // Sample gear data
  const gearCollection = [
    { 
      id: 'helmet-1',
      brand: 'Shoei', 
      model: 'X-Fourteen', 
      category: 'helmet', 
      size: 'L', 
      color: 'Marquez 5',
      purchaseDate: '2024-03-15',
      rating: 5,
      protection: 95,
      fitNotes: { crown: 'perfect', cheeks: 'slightly tight' },
      reviews: 'Excellent helmet, great ventilation and visibility',
      image: '/assets/images/gear/helmet-1.jpg'
    },
    {
      id: 'jacket-1',
      brand: 'Alpinestars', 
      model: 'GP Plus R v2', 
      category: 'jacket', 
      size: '52', 
      color: 'Black/White',
      purchaseDate: '2024-01-10',
      rating: 5,
      protection: 85,
      fitNotes: { shoulders: 'perfect', chest: 'perfect', waist: 'slightly loose' },
      image: '/assets/images/gear/jacket-1.jpg'
    },
    {
      id: 'gloves-1',
      brand: 'Dainese',
      model: 'Full Metal 6',
      category: 'gloves',
      size: 'L',
      color: 'Black',
      purchaseDate: '2024-02-20',
      rating: 4,
      protection: 80,
      image: '/assets/images/gear/gloves-1.jpg'
    },
    {
      id: 'pants-1',
      brand: 'Alpinestars',
      model: 'Missile v2',
      category: 'pants',
      size: '32',
      color: 'Black',
      purchaseDate: '2024-01-10',
      rating: 5,
      protection: 75,
      fitNotes: { waist: 'perfect', thighs: 'perfect', knees: 'slightly tight' },
      image: '/assets/images/gear/pants-1.jpg'
    },
    {
      id: 'boots-1',
      brand: 'Alpinestars',
      model: 'Supertech R',
      category: 'boots',
      size: '43',
      color: 'Black/Red',
      purchaseDate: '2023-12-05',
      rating: 5,
      protection: 90,
      image: '/assets/images/gear/boots-1.jpg'
    }
  ];
  
  // Current loadout
  const currentLoadout = {
    helmet: 'helmet-1',
    jacket: 'jacket-1',
    gloves: 'gloves-1',
    pants: 'pants-1',
    boots: 'boots-1',
    backpack: null,
    hydration: null
  };
  
  // Display equipped items in slots
  Object.entries(currentLoadout).forEach(([slot, itemId]) => {
    updateSlotDisplay(slot, itemId, gearCollection);
  });
  
  // Display gear collection
  displayGearCollection(gearCollection);
  
  // Update protection stats
  updateProtectionStats(currentLoadout, gearCollection);
  
  // Setup event listeners
  setupLoadoutEventListeners(gearCollection);
}

function updateSlotDisplay(slot, itemId, gearCollection) {
  const slotElement = document.getElementById(`${slot}Slot`);
  if (!slotElement) return;
  
  if (itemId) {
    const item = gearCollection.find(g => g.id === itemId);
    if (item) {
      slotElement.classList.remove('empty');
      slotElement.innerHTML = `
        <div class="equipped-item">
          <img src="${item.image}" alt="${item.model}" class="equipped-item-image">
          <div class="equipped-item-info">
            <h5>${item.model}</h5>
            <p>${item.brand} • ${item.size}</p>
          </div>
          <div class="equipped-item-actions">
            <button class="item-action-btn" onclick="viewGearDetails('${item.id}')" title="View Details">
              <span>🔍</span>
            </button>
            <button class="item-action-btn" onclick="unequipItem('${slot}')" title="Remove">
              <span>❌</span>
            </button>
          </div>
        </div>
      `;
      
      // Update character SVG
      const svgSlot = document.querySelector(`.gear-slot[data-slot="${slot}"]`);
      if (svgSlot) {
        svgSlot.classList.add('equipped');
      }
    }
  } else {
    slotElement.classList.add('empty');
    slotElement.innerHTML = `<span>Empty Slot</span>`;
  }
}

function displayGearCollection(gearCollection) {
  const collectionGrid = document.getElementById('gearCollection');
  if (!collectionGrid) return;
  
  collectionGrid.innerHTML = gearCollection.map(item => `
    <div class="collection-item ${isItemEquipped(item.id) ? 'equipped' : ''}" 
         data-item-id="${item.id}"
         onclick="selectGearItem('${item.id}')">
      <img src="${item.image}" alt="${item.model}" class="collection-item-image">
      <h5 class="collection-item-name">${item.model}</h5>
      <p class="collection-item-brand">${item.brand}</p>
      <div class="collection-item-stats">
        <span class="item-rating">${'★'.repeat(item.rating)}</span>
        <span class="item-protection">${item.protection}%</span>
      </div>
    </div>
  `).join('');
}

function updateProtectionStats(loadout, gearCollection) {
  const protectionValues = {
    head: 0,
    torso: 0,
    arms: 0,
    legs: 0
  };
  
  // Calculate protection based on equipped items
  if (loadout.helmet) {
    const helmet = gearCollection.find(g => g.id === loadout.helmet);
    if (helmet) protectionValues.head = helmet.protection;
  }
  
  if (loadout.jacket) {
    const jacket = gearCollection.find(g => g.id === loadout.jacket);
    if (jacket) {
      protectionValues.torso = jacket.protection;
      protectionValues.arms = jacket.protection * 0.9; // Arms typically have slightly less protection
    }
  }
  
  if (loadout.pants) {
    const pants = gearCollection.find(g => g.id === loadout.pants);
    if (pants) protectionValues.legs = pants.protection;
  }
  
  // Update the UI
  Object.entries(protectionValues).forEach(([area, value]) => {
    const bar = document.querySelector(`.protection-bar:has(.protection-label:contains("${area.charAt(0).toUpperCase() + area.slice(1)}")) .bar-fill`);
    if (bar) {
      bar.style.width = `${value}%`;
    }
    const valueSpan = document.querySelector(`.protection-bar:has(.protection-label:contains("${area.charAt(0).toUpperCase() + area.slice(1)}")) .protection-value`);
    if (valueSpan) {
      valueSpan.textContent = `${value}%`;
    }
  });
}

function setupLoadoutEventListeners(gearCollection) {
  // View toggle buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // TODO: Switch character view
    });
  });
  
  // Category filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      filterGearCollection(this.dataset.category, gearCollection);
    });
  });
  
  // Loadout preset selector
  document.getElementById('loadoutPreset')?.addEventListener('change', function() {
    // TODO: Load preset loadouts
  });
}

function filterGearCollection(category, gearCollection) {
  const filtered = category === 'all' 
    ? gearCollection 
    : gearCollection.filter(item => item.category === category);
  displayGearCollection(filtered);
}

// Global functions for onclick events
window.viewGearDetails = function(itemId) {
  showGearDetailModal(itemId);
};

window.unequipItem = function(slot) {
  const currentLoadout = getCurrentLoadout();
  currentLoadout[slot] = null;
  updateSlotDisplay(slot, null, getGearCollection());
  updateProtectionStats(currentLoadout, getGearCollection());
};

window.selectGearItem = function(itemId) {
  const gearCollection = getGearCollection();
  const item = gearCollection.find(g => g.id === itemId);
  if (!item) return;
  
  const currentLoadout = getCurrentLoadout();
  currentLoadout[item.category] = itemId;
  updateSlotDisplay(item.category, itemId, gearCollection);
  updateProtectionStats(currentLoadout, gearCollection);
  displayGearCollection(gearCollection);
};

window.isItemEquipped = function(itemId) {
  const currentLoadout = getCurrentLoadout();
  return Object.values(currentLoadout).includes(itemId);
};

// Gear detail modal functions
function showGearDetailModal(itemId) {
  const gearCollection = getGearCollection();
  const item = gearCollection.find(g => g.id === itemId);
  if (!item) return;
  
  const modal = document.getElementById('gearDetailModal');
  const modalTitle = document.getElementById('modalGearTitle');
  const modalContent = document.getElementById('modalGearContent');
  
  modalTitle.textContent = `${item.brand} ${item.model}`;
  
  // Get size recommendations if user has measurements
  const userMeasurements = getUserMeasurements();
  const sizeRecommendations = userMeasurements && window.gearSizeRecommendations 
    ? window.gearSizeRecommendations.getSizeRecommendations(userMeasurements, item.category)
    : null;
  
  modalContent.innerHTML = `
    <div class="gear-detail-view">
      <div class="gear-detail-grid">
        <div class="gear-detail-image">
          <img src="${item.image || '/assets/images/gear-placeholder.png'}" alt="${item.model}">
        </div>
        <div class="gear-detail-info">
          <div class="detail-row">
            <span class="detail-label">Brand:</span>
            <span class="detail-value">${item.brand}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Model:</span>
            <span class="detail-value">${item.model}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Size:</span>
            <span class="detail-value">${item.size}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Color:</span>
            <span class="detail-value">${item.color}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Purchase Date:</span>
            <span class="detail-value">${new Date(item.purchaseDate).toLocaleDateString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Rating:</span>
            <span class="detail-value">${'★'.repeat(item.rating)}${'☆'.repeat(5-item.rating)}</span>
          </div>
        </div>
      </div>
      
      ${item.fitNotes ? `
        <div class="fit-feedback-section">
          <h4>Fit Information</h4>
          <div class="fit-notes">
            ${Object.entries(item.fitNotes).map(([area, fit]) => `
              <div class="fit-note">
                <span class="fit-area">${area}:</span>
                <span class="fit-status ${fit.replace(' ', '-')}">${fit}</span>
              </div>
            `).join('')}
          </div>
          <button class="btn-primary" onclick="openFitFeedbackModal('${itemId}')">Update Fit Feedback</button>
        </div>
      ` : `
        <div class="fit-feedback-section">
          <button class="btn-primary" onclick="openFitFeedbackModal('${itemId}')">Add Fit Feedback</button>
        </div>
      `}
      
      ${item.reviews ? `
        <div class="reviews-section">
          <h4>Your Review</h4>
          <p>${item.reviews}</p>
        </div>
      ` : ''}
      
      ${sizeRecommendations && sizeRecommendations.recommendations && sizeRecommendations.recommendations.length > 0 ? `
        <div class="size-recommendations-section">
          <h4>Size Recommendations</h4>
          <div class="size-recommendations">
            ${sizeRecommendations.recommendations.map(rec => `
              <div class="size-recommendation">
                <div class="recommendation-brand">${rec.brand}</div>
                <div class="recommendation-size">${rec.size}</div>
                <div class="recommendation-confidence">${rec.confidence}% match</div>
                ${rec.notes ? `<div class="recommendation-notes">${rec.notes}</div>` : ''}
              </div>
            `).join('')}
          </div>
          <button class="btn-secondary" onclick="showSizeChart('${item.category}')">View Size Chart</button>
        </div>
      ` : ''}
    </div>
  `;
  
  modal.classList.add('active');
}

window.closeGearModal = function() {
  document.getElementById('gearDetailModal').classList.remove('active');
};

window.closeFitModal = function() {
  document.getElementById('fitFeedbackModal').classList.remove('active');
};

// Fit feedback modal
window.openFitFeedbackModal = function(itemId) {
  const gearCollection = getGearCollection();
  const item = gearCollection.find(g => g.id === itemId);
  if (!item) return;
  
  const modal = document.getElementById('fitFeedbackModal');
  const visualization = document.getElementById('fitVisualization');
  const fitGrid = document.getElementById('fitGrid');
  
  // Store current item ID for saving
  modal.dataset.itemId = itemId;
  
  // Create fit visualization based on gear type
  visualization.innerHTML = createFitVisualization(item.category, item.fitNotes || {});
  
  // Create fit control sliders
  const bodyParts = getBodyPartsForGearType(item.category);
  fitGrid.innerHTML = bodyParts.map(part => `
    <div class="fit-control" data-part="${part}">
      <h5>${formatBodyPart(part)}</h5>
      <div class="fit-slider">
        <span class="fit-label">Tight</span>
        <input type="range" 
               min="1" 
               max="5" 
               value="${getFitValue(item.fitNotes?.[part])}" 
               data-part="${part}"
               oninput="updateFitVisualization('${part}', this.value)">
        <span class="fit-label">Loose</span>
      </div>
    </div>
  `).join('');
  
  // Close gear detail modal first
  closeGearModal();
  modal.classList.add('active');
};

function createFitVisualization(gearType, fitNotes) {
  const svgTemplates = {
    helmet: `
      <svg class="fit-body-svg" viewBox="0 0 300 400">
        <g class="fit-areas">
          <!-- Head outline -->
          <ellipse cx="150" cy="150" rx="80" ry="100" fill="none" stroke="#666" stroke-width="2"/>
          <!-- Crown area -->
          <ellipse cx="150" cy="100" rx="60" ry="40" 
                   class="fit-area" 
                   data-part="crown" 
                   fill="${getFitColor(fitNotes.crown)}" 
                   opacity="0.6"
                   onclick="cycleFitStatus('crown')"/>
          <!-- Cheeks area -->
          <ellipse cx="150" cy="150" rx="70" ry="50" 
                   class="fit-area" 
                   data-part="cheeks" 
                   fill="${getFitColor(fitNotes.cheeks)}" 
                   opacity="0.6"
                   onclick="cycleFitStatus('cheeks')"/>
          <!-- Jawline area -->
          <ellipse cx="150" cy="200" rx="50" ry="30" 
                   class="fit-area" 
                   data-part="jawline" 
                   fill="${getFitColor(fitNotes.jawline)}" 
                   opacity="0.6"
                   onclick="cycleFitStatus('jawline')"/>
        </g>
        <text x="150" y="350" text-anchor="middle" fill="#999" font-size="14">
          Click areas to adjust fit
        </text>
      </svg>
    `,
    jacket: `
      <svg class="fit-body-svg" viewBox="0 0 300 400">
        <g class="fit-areas">
          <!-- Torso outline -->
          <path d="M100,50 L100,250 L200,250 L200,50 Z" fill="none" stroke="#666" stroke-width="2"/>
          <!-- Arms outline -->
          <path d="M100,80 L50,80 L50,200 L80,200" fill="none" stroke="#666" stroke-width="2"/>
          <path d="M200,80 L250,80 L250,200 L220,200" fill="none" stroke="#666" stroke-width="2"/>
          
          <!-- Shoulders -->
          <rect x="80" y="50" width="140" height="40" 
                class="fit-area" 
                data-part="shoulders" 
                fill="${getFitColor(fitNotes.shoulders)}" 
                opacity="0.6"
                onclick="cycleFitStatus('shoulders')"/>
          <!-- Chest -->
          <rect x="100" y="100" width="100" height="60" 
                class="fit-area" 
                data-part="chest" 
                fill="${getFitColor(fitNotes.chest)}" 
                opacity="0.6"
                onclick="cycleFitStatus('chest')"/>
          <!-- Waist -->
          <rect x="110" y="180" width="80" height="50" 
                class="fit-area" 
                data-part="waist" 
                fill="${getFitColor(fitNotes.waist)}" 
                opacity="0.6"
                onclick="cycleFitStatus('waist')"/>
          <!-- Arms -->
          <rect x="50" y="100" width="40" height="80" 
                class="fit-area" 
                data-part="arms" 
                fill="${getFitColor(fitNotes.arms)}" 
                opacity="0.6"
                onclick="cycleFitStatus('arms')"/>
          <rect x="210" y="100" width="40" height="80" 
                class="fit-area" 
                data-part="arms" 
                fill="${getFitColor(fitNotes.arms)}" 
                opacity="0.6"
                onclick="cycleFitStatus('arms')"/>
        </g>
        <text x="150" y="350" text-anchor="middle" fill="#999" font-size="14">
          Click areas to adjust fit
        </text>
      </svg>
    `,
    gloves: `
      <svg class="fit-body-svg" viewBox="0 0 300 400">
        <g class="fit-areas">
          <!-- Hand outline -->
          <path d="M120,200 L120,300 L180,300 L180,200" fill="none" stroke="#666" stroke-width="2"/>
          <!-- Fingers -->
          <path d="M130,200 L130,150 M145,200 L145,140 M155,200 L155,140 M170,200 L170,150" 
                stroke="#666" stroke-width="2"/>
          
          <!-- Fingers area -->
          <rect x="125" y="140" width="50" height="60" 
                class="fit-area" 
                data-part="fingers" 
                fill="${getFitColor(fitNotes.fingers)}" 
                opacity="0.6"
                onclick="cycleFitStatus('fingers')"/>
          <!-- Palm area -->
          <rect x="120" y="200" width="60" height="60" 
                class="fit-area" 
                data-part="palm" 
                fill="${getFitColor(fitNotes.palm)}" 
                opacity="0.6"
                onclick="cycleFitStatus('palm')"/>
          <!-- Wrist area -->
          <rect x="125" y="260" width="50" height="40" 
                class="fit-area" 
                data-part="wrist" 
                fill="${getFitColor(fitNotes.wrist)}" 
                opacity="0.6"
                onclick="cycleFitStatus('wrist')"/>
        </g>
        <text x="150" y="350" text-anchor="middle" fill="#999" font-size="14">
          Click areas to adjust fit
        </text>
      </svg>
    `,
    pants: `
      <svg class="fit-body-svg" viewBox="0 0 300 400">
        <g class="fit-areas">
          <!-- Legs outline -->
          <path d="M100,50 L100,200 L80,350 L120,350 L130,200" fill="none" stroke="#666" stroke-width="2"/>
          <path d="M200,50 L200,200 L220,350 L180,350 L170,200" fill="none" stroke="#666" stroke-width="2"/>
          <path d="M100,50 L200,50" stroke="#666" stroke-width="2"/>
          
          <!-- Waist area -->
          <rect x="100" y="50" width="100" height="40" 
                class="fit-area" 
                data-part="waist" 
                fill="${getFitColor(fitNotes.waist)}" 
                opacity="0.6"
                onclick="cycleFitStatus('waist')"/>
          <!-- Hips area -->
          <rect x="90" y="90" width="120" height="50" 
                class="fit-area" 
                data-part="hips" 
                fill="${getFitColor(fitNotes.hips)}" 
                opacity="0.6"
                onclick="cycleFitStatus('hips')"/>
          <!-- Thighs area -->
          <rect x="85" y="140" width="45" height="80" 
                class="fit-area" 
                data-part="thighs" 
                fill="${getFitColor(fitNotes.thighs)}" 
                opacity="0.6"
                onclick="cycleFitStatus('thighs')"/>
          <rect x="170" y="140" width="45" height="80" 
                class="fit-area" 
                data-part="thighs" 
                fill="${getFitColor(fitNotes.thighs)}" 
                opacity="0.6"
                onclick="cycleFitStatus('thighs')"/>
          <!-- Knees area -->
          <ellipse cx="107" cy="240" rx="23" ry="20" 
                   class="fit-area" 
                   data-part="knees" 
                   fill="${getFitColor(fitNotes.knees)}" 
                   opacity="0.6"
                   onclick="cycleFitStatus('knees')"/>
          <ellipse cx="193" cy="240" rx="23" ry="20" 
                   class="fit-area" 
                   data-part="knees" 
                   fill="${getFitColor(fitNotes.knees)}" 
                   opacity="0.6"
                   onclick="cycleFitStatus('knees')"/>
        </g>
        <text x="150" y="380" text-anchor="middle" fill="#999" font-size="14">
          Click areas to adjust fit
        </text>
      </svg>
    `,
    boots: `
      <svg class="fit-body-svg" viewBox="0 0 300 400">
        <g class="fit-areas">
          <!-- Boot outline -->
          <path d="M100,100 L100,300 L180,300 L180,280 L170,100" fill="none" stroke="#666" stroke-width="2"/>
          <path d="M100,300 L80,320 L200,320 L180,300" fill="none" stroke="#666" stroke-width="2"/>
          
          <!-- Calf area -->
          <rect x="100" y="100" width="70" height="80" 
                class="fit-area" 
                data-part="calf" 
                fill="${getFitColor(fitNotes.calf)}" 
                opacity="0.6"
                onclick="cycleFitStatus('calf')"/>
          <!-- Ankle area -->
          <rect x="105" y="180" width="60" height="60" 
                class="fit-area" 
                data-part="ankle" 
                fill="${getFitColor(fitNotes.ankle)}" 
                opacity="0.6"
                onclick="cycleFitStatus('ankle')"/>
          <!-- Foot area -->
          <rect x="100" y="240" width="80" height="60" 
                class="fit-area" 
                data-part="length" 
                fill="${getFitColor(fitNotes.length)}" 
                opacity="0.6"
                onclick="cycleFitStatus('length')"/>
          <rect x="80" y="300" width="120" height="20" 
                class="fit-area" 
                data-part="width" 
                fill="${getFitColor(fitNotes.width)}" 
                opacity="0.6"
                onclick="cycleFitStatus('width')"/>
        </g>
        <text x="150" y="360" text-anchor="middle" fill="#999" font-size="14">
          Click areas to adjust fit
        </text>
      </svg>
    `
  };
  
  return svgTemplates[gearType] || '<p>Fit visualization not available for this gear type</p>';
}

function getFitColor(fitStatus) {
  const colors = {
    'perfect': '#22c55e',
    'slightly tight': '#f59e0b',
    'slightly-tight': '#f59e0b',
    'slightly loose': '#3b82f6',
    'slightly-loose': '#3b82f6',
    'tight': '#ef4444',
    'loose': '#dc2626'
  };
  return colors[fitStatus] || '#666';
}

function getFitValue(fitStatus) {
  const values = {
    'tight': 1,
    'slightly tight': 2,
    'slightly-tight': 2,
    'perfect': 3,
    'slightly loose': 4,
    'slightly-loose': 4,
    'loose': 5
  };
  return values[fitStatus] || 3;
}

function getBodyPartsForGearType(gearType) {
  const bodyParts = {
    helmet: ['crown', 'cheeks', 'jawline'],
    jacket: ['shoulders', 'chest', 'waist', 'arms'],
    gloves: ['fingers', 'palm', 'wrist'],
    pants: ['waist', 'hips', 'thighs', 'knees'],
    boots: ['length', 'width', 'ankle', 'calf']
  };
  return bodyParts[gearType] || [];
}

function formatBodyPart(part) {
  return part.charAt(0).toUpperCase() + part.slice(1).replace(/([A-Z])/g, ' $1');
}

window.updateFitVisualization = function(part, value) {
  const fitStatuses = ['tight', 'slightly tight', 'perfect', 'slightly loose', 'loose'];
  const status = fitStatuses[value - 1];
  const color = getFitColor(status);
  
  // Update all areas with this part
  document.querySelectorAll(`.fit-area[data-part="${part}"]`).forEach(area => {
    area.setAttribute('fill', color);
  });
};

window.cycleFitStatus = function(part) {
  const area = document.querySelector(`.fit-area[data-part="${part}"]`);
  if (!area) return;
  
  const currentColor = area.getAttribute('fill');
  const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#dc2626'];
  const statuses = ['tight', 'slightly tight', 'perfect', 'slightly loose', 'loose'];
  
  let currentIndex = colors.indexOf(currentColor);
  if (currentIndex === -1) currentIndex = 2; // Default to perfect
  
  const nextIndex = (currentIndex + 1) % colors.length;
  const nextColor = colors[nextIndex];
  const nextStatus = statuses[nextIndex];
  
  // Update visualization
  document.querySelectorAll(`.fit-area[data-part="${part}"]`).forEach(a => {
    a.setAttribute('fill', nextColor);
  });
  
  // Update slider
  const slider = document.querySelector(`input[data-part="${part}"]`);
  if (slider) {
    slider.value = nextIndex + 1;
  }
};

window.saveFitFeedback = function() {
  const modal = document.getElementById('fitFeedbackModal');
  const itemId = modal.dataset.itemId;
  const gearCollection = getGearCollection();
  const item = gearCollection.find(g => g.id === itemId);
  
  if (!item) return;
  
  // Collect fit feedback from sliders
  const fitNotes = {};
  document.querySelectorAll('.fit-slider input').forEach(slider => {
    const part = slider.dataset.part;
    const value = parseInt(slider.value);
    const statuses = ['tight', 'slightly tight', 'perfect', 'slightly loose', 'loose'];
    fitNotes[part] = statuses[value - 1];
  });
  
  // Update item with new fit notes
  item.fitNotes = fitNotes;
  
  // Save and close modal
  console.log('Saved fit feedback:', fitNotes);
  closeFitModal();
  
  // Refresh the gear detail modal if it was open
  if (document.getElementById('gearDetailModal').classList.contains('active')) {
    showGearDetailModal(itemId);
  }
};

// Helper functions to get/set data
function getGearCollection() {
  // In a real app, this would fetch from a database
  // For now, return the mock data
  return [
    { 
      id: 'helmet-1',
      brand: 'Shoei', 
      model: 'X-Fourteen', 
      category: 'helmet', 
      size: 'L', 
      color: 'Marquez 5',
      purchaseDate: '2024-03-15',
      rating: 5,
      protection: 95,
      fitNotes: { crown: 'perfect', cheeks: 'slightly tight' },
      reviews: 'Excellent helmet, great ventilation and visibility',
      image: '/assets/images/gear/helmet-1.jpg'
    },
    {
      id: 'jacket-1',
      brand: 'Alpinestars', 
      model: 'GP Plus R v2', 
      category: 'jacket', 
      size: '52', 
      color: 'Black/White',
      purchaseDate: '2024-01-10',
      rating: 5,
      protection: 85,
      fitNotes: { shoulders: 'perfect', chest: 'perfect', waist: 'slightly loose' },
      image: '/assets/images/gear/jacket-1.jpg'
    },
    {
      id: 'gloves-1',
      brand: 'Dainese',
      model: 'Full Metal 6',
      category: 'gloves',
      size: 'L',
      color: 'Black',
      purchaseDate: '2024-02-20',
      rating: 4,
      protection: 80,
      image: '/assets/images/gear/gloves-1.jpg'
    },
    {
      id: 'pants-1',
      brand: 'Alpinestars',
      model: 'Missile v2',
      category: 'pants',
      size: '32',
      color: 'Black',
      purchaseDate: '2024-01-10',
      rating: 5,
      protection: 75,
      fitNotes: { waist: 'perfect', thighs: 'perfect', knees: 'slightly tight' },
      image: '/assets/images/gear/pants-1.jpg'
    },
    {
      id: 'boots-1',
      brand: 'Alpinestars',
      model: 'Supertech R',
      category: 'boots',
      size: '43',
      color: 'Black/Red',
      purchaseDate: '2023-12-05',
      rating: 5,
      protection: 90,
      image: '/assets/images/gear/boots-1.jpg'
    }
  ];
}

function getCurrentLoadout() {
  // In a real app, this would be stored in state or database
  if (!window.currentLoadout) {
    window.currentLoadout = {
      helmet: 'helmet-1',
      jacket: 'jacket-1',
      gloves: 'gloves-1',
      pants: 'pants-1',
      boots: 'boots-1'
    };
  }
  return window.currentLoadout;
}

function getUserMeasurements() {
  // In a real app, this would fetch from user profile
  // For demo, return mock measurements
  return {
    headCircumference: 58, // cm
    chest: 102, // cm
    waist: 86, // cm
    hips: 98, // cm
    inseam: 82, // cm
    height: 180, // cm
    weight: 75, // kg
    handCircumference: 22, // cm
    shoeSize: 10 // US
  };
}

window.showSizeChart = function(gearType) {
  const chart = window.gearSizeRecommendations.generateSizeChart(gearType);
  if (!chart) return;
  
  // Create a modal or display the size chart
  alert(`Size chart for ${gearType} would be displayed here. Check console for details.`);
  console.log('Size Chart:', chart);
};

// Shareable gear list functions
window.showGearListCreator = function() {
  const modal = document.getElementById('gearListCreatorModal');
  const content = document.getElementById('gearListCreatorContent');
  const gearCollection = getGearCollection();
  
  // Create gear list creator instance
  window.gearListCreator = new GearListCreator(content, gearCollection);
  modal.classList.add('active');
};

window.closeGearListCreator = function() {
  document.getElementById('gearListCreatorModal').classList.remove('active');
};

window.showMyGearLists = function() {
  const modal = document.getElementById('myGearListsModal');
  const content = document.getElementById('myGearListsContent');
  const lists = shareableGearLists.getGearLists();
  
  if (lists.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <p>You haven't created any gear lists yet.</p>
        <button class="btn-primary" onclick="closeMyGearLists(); showGearListCreator();">
          Create Your First List
        </button>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="gear-lists-grid">
        ${lists.map(list => {
          const rideType = shareableGearLists.rideTypes[list.rideType];
          const stats = shareableGearLists.getGearListStats(list);
          return `
            <div class="gear-list-card">
              <div class="list-header">
                <span class="list-icon">${rideType.icon}</span>
                <h4>${list.name}</h4>
              </div>
              <div class="list-meta">
                <span>${rideType.name}</span>
                <span>•</span>
                <span>${stats.itemCount} items</span>
              </div>
              <div class="list-share-code">
                Code: <strong>${list.shareCode}</strong>
              </div>
              <div class="list-actions">
                <button class="btn-sm" onclick="viewGearList('${list.id}')">View</button>
                <button class="btn-sm" onclick="shareGearList('${list.shareCode}')">Share</button>
                <button class="btn-sm btn-danger" onclick="deleteGearList('${list.id}')">Delete</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  modal.classList.add('active');
};

window.closeMyGearLists = function() {
  document.getElementById('myGearListsModal').classList.remove('active');
};

window.viewGearList = function(listId) {
  const lists = shareableGearLists.getGearLists();
  const list = lists.find(l => l.id === listId);
  if (list) {
    console.log('View gear list:', list);
    // In a real app, this would open a detailed view
  }
};

window.shareGearList = function(shareCode) {
  const shareUrl = shareableGearLists.generateShareUrl(shareCode);
  
  if (navigator.share) {
    navigator.share({
      title: 'Check out my gear list',
      text: `View my motorcycle gear setup with code: ${shareCode}`,
      url: shareUrl
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  }
};

window.deleteGearList = function(listId) {
  if (confirm('Are you sure you want to delete this gear list?')) {
    shareableGearLists.deleteGearList(listId);
    showMyGearLists(); // Refresh the list
  }
};

function loadInventoryData() {
  // Simple gear list - just items the user owns and uses
  const myGear = [
    {
      id: 'tool-1',
      name: 'Multi-tool',
      brand: 'Park Tool',
      model: 'IB-3',
      image: '/assets/images/gear/multi-tool.jpg',
      purchaseDate: '2023-06-15',
      usage: 'high',
      notes: 'Essential for trailside repairs',
      tags: ['tools', 'repair', 'essential']
    },
    {
      id: 'light-1',
      name: 'Front Light',
      brand: 'Garmin',
      model: 'Varia UT800',
      image: '/assets/images/gear/front-light.jpg',
      purchaseDate: '2024-01-20',
      usage: 'high',
      notes: 'Smart light with brightness adjustment',
      tags: ['lights', 'safety', 'electronics']
    },
    {
      id: 'computer-1',
      name: 'Bike Computer',
      brand: 'Wahoo',
      model: 'ELEMNT Bolt',
      image: '/assets/images/gear/bike-computer.jpg',
      purchaseDate: '2023-11-10',
      usage: 'high',
      notes: 'GPS tracking and performance metrics',
      tags: ['electronics', 'gps', 'training']
    },
    {
      id: 'bag-1',
      name: 'Saddle Bag',
      brand: 'Topeak',
      model: 'Aero Wedge',
      image: '/assets/images/gear/saddle-bag.jpg',
      purchaseDate: '2023-03-05',
      usage: 'medium',
      notes: 'Compact storage for tools and tubes',
      tags: ['storage', 'bags']
    },
    {
      id: 'pump-1',
      name: 'CO2 Inflator',
      brand: 'Lezyne',
      model: 'Control Drive',
      image: '/assets/images/gear/co2-inflator.jpg',
      purchaseDate: '2023-07-22',
      usage: 'medium',
      notes: 'Quick inflation for roadside repairs',
      tags: ['tools', 'repair']
    },
    {
      id: 'camera-1',
      name: 'Action Camera',
      brand: 'GoPro',
      model: 'Hero 11',
      image: '/assets/images/gear/gopro.jpg',
      purchaseDate: '2024-02-14',
      usage: 'medium',
      notes: 'For recording epic rides',
      tags: ['electronics', 'camera', 'recording']
    },
    {
      id: 'lock-1',
      name: 'Bike Lock',
      brand: 'Kryptonite',
      model: 'Evolution Series 4',
      image: '/assets/images/gear/bike-lock.jpg',
      purchaseDate: '2022-12-01',
      usage: 'low',
      notes: 'Heavy duty U-lock for urban rides',
      tags: ['security', 'lock']
    },
    {
      id: 'bottle-1',
      name: 'Water Bottle',
      brand: 'CamelBak',
      model: 'Podium Chill',
      image: '/assets/images/gear/water-bottle.jpg',
      purchaseDate: '2024-03-10',
      usage: 'high',
      notes: 'Insulated bottle keeps water cold',
      tags: ['hydration', 'bottles']
    }
  ];
  
  // Store gear data globally
  window.inventoryGear = myGear;
  
  // Initial render
  renderInventory(myGear);
  
  // Setup event listeners
  setupInventoryEventListeners();
}

function renderInventory(gear, view = 'grid') {
  const container = document.getElementById('inventoryGrid');
  if (!container) return;
  
  container.className = view === 'grid' ? 'inventory-grid' : 'inventory-list';
  
  if (gear.length === 0) {
    container.innerHTML = `
      <div class="empty-inventory">
        <p>No gear found. Start adding items you own!</p>
        <button class="btn-primary" onclick="showAddGearModal()">Add Your First Item</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = gear.map(item => 
    view === 'grid' ? renderGearCard(item) : renderGearListItem(item)
  ).join('');
}

function renderGearCard(item) {
  const usageColors = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#6b7280'
  };
  
  return `
    <div class="gear-card" data-gear-id="${item.id}">
      <div class="gear-image">
        <img src="${item.image || '/assets/images/gear-placeholder.png'}" alt="${item.name}">
        <div class="gear-usage-badge" style="background-color: ${usageColors[item.usage]}">
          ${item.usage} use
        </div>
      </div>
      <div class="gear-info">
        <h4 class="gear-name">${item.name}</h4>
        <p class="gear-brand">${item.brand} ${item.model}</p>
        <p class="gear-notes">${item.notes}</p>
        <div class="gear-tags">
          ${item.tags.map(tag => `<span class="gear-tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="gear-actions">
        <button class="gear-action-btn" onclick="editGearItem('${item.id}')" title="Edit">
          <span>✏️</span>
        </button>
        <button class="gear-action-btn" onclick="deleteGearItem('${item.id}')" title="Delete">
          <span>🗑️</span>
        </button>
      </div>
    </div>
  `;
}

function renderGearListItem(item) {
  const usageColors = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#6b7280'
  };
  
  return `
    <div class="gear-list-item" data-gear-id="${item.id}">
      <div class="gear-image">
        <img src="${item.image || '/assets/images/gear-placeholder.png'}" alt="${item.name}">
      </div>
      <div class="gear-details">
        <div class="gear-main-info">
          <h4>${item.name}</h4>
          <p>${item.brand} ${item.model}</p>
        </div>
        <div class="gear-meta">
          <span class="gear-usage" style="color: ${usageColors[item.usage]}">
            ${item.usage} use
          </span>
          <span class="gear-date">Added ${new Date(item.purchaseDate).toLocaleDateString()}</span>
        </div>
        <p class="gear-notes">${item.notes}</p>
        <div class="gear-tags">
          ${item.tags.map(tag => `<span class="gear-tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="gear-actions">
        <button class="gear-action-btn" onclick="editGearItem('${item.id}')">Edit</button>
        <button class="gear-action-btn" onclick="deleteGearItem('${item.id}')">Delete</button>
      </div>
    </div>
  `;
}

function setupInventoryEventListeners() {
  // View toggle
  document.querySelectorAll('#inventory-tab .view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#inventory-tab .view-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderInventory(window.inventoryGear, this.dataset.view);
    });
  });
  
  // Search functionality
  const searchInput = document.getElementById('inventorySearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = window.inventoryGear.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
      const currentView = document.querySelector('#inventory-tab .view-btn.active').dataset.view;
      renderInventory(filtered, currentView);
    });
  }
  
  // Sort functionality
  const sortSelect = document.getElementById('inventorySort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const sortBy = e.target.value;
      let sorted = [...window.inventoryGear];
      
      switch(sortBy) {
        case 'name':
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'brand':
          sorted.sort((a, b) => a.brand.localeCompare(b.brand));
          break;
        case 'recent':
          sorted.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
          break;
        case 'usage':
          const usageOrder = { high: 0, medium: 1, low: 2 };
          sorted.sort((a, b) => usageOrder[a.usage] - usageOrder[b.usage]);
          break;
      }
      
      const currentView = document.querySelector('#inventory-tab .view-btn.active').dataset.view;
      renderInventory(sorted, currentView);
    });
  }
}

// Global functions for gear actions
window.showAddGearModal = function() {
  // In a real app, this would open a modal to add new gear
  console.log('Show add gear modal');
};

window.editGearItem = function(itemId) {
  const item = window.inventoryGear.find(g => g.id === itemId);
  console.log('Edit gear item:', item);
  // In a real app, this would open an edit modal
};

window.deleteGearItem = function(itemId) {
  if (confirm('Are you sure you want to remove this item from your gear?')) {
    window.inventoryGear = window.inventoryGear.filter(g => g.id !== itemId);
    const currentView = document.querySelector('#inventory-tab .view-btn.active').dataset.view;
    renderInventory(window.inventoryGear, currentView);
  }
};

function loadFriendsData() {
  // Initialize friends functionality
  initializeFriendsTab();
}

function initializeFriendsTab() {
  // Sample friends data
  const friendsData = {
    friends: [
      {
        id: 'friend-1',
        name: 'Mike Chen',
        username: '@mikerides',
        bio: 'Sport bike enthusiast | Track day regular',
        avatar: '/assets/images/avatars/avatar-1.jpg',
        isOnline: true,
        bikes: 5,
        miles: '15.2k',
        mutualFriends: 3,
        isRidingBuddy: true,
        distance: null
      },
      {
        id: 'friend-2',
        name: 'Sarah Johnson',
        username: '@sarahrides',
        bio: 'Adventure rider | Cross-country tourer',
        avatar: '/assets/images/avatars/avatar-2.jpg',
        isOnline: false,
        bikes: 2,
        miles: '32.5k',
        mutualFriends: 7,
        isRidingBuddy: false,
        distance: null
      },
      {
        id: 'friend-3',
        name: 'Alex Rivera',
        username: '@alexrider',
        bio: 'Harley enthusiast | Weekend warrior',
        avatar: '/assets/images/avatars/avatar-3.jpg',
        isOnline: true,
        bikes: 3,
        miles: '8.7k',
        mutualFriends: 1,
        isRidingBuddy: true,
        distance: null
      },
      {
        id: 'friend-4',
        name: 'Jessica Lee',
        username: '@jessrides',
        bio: 'Cafe racer builder | Vintage bikes',
        avatar: '/assets/images/avatars/avatar-4.jpg',
        isOnline: false,
        bikes: 4,
        miles: '6.3k',
        mutualFriends: 5,
        isRidingBuddy: false,
        distance: 12
      },
      {
        id: 'friend-5',
        name: 'David Kim',
        username: '@dkimrides',
        bio: 'Electric bike pioneer | Tech enthusiast',
        avatar: '/assets/images/avatars/avatar-5.jpg',
        isOnline: true,
        bikes: 2,
        miles: '4.2k',
        mutualFriends: 2,
        isRidingBuddy: true,
        distance: 8
      },
      {
        id: 'friend-6',
        name: 'Maria Garcia',
        username: '@mariarides',
        bio: 'Dual sport rider | Off-road explorer',
        avatar: '/assets/images/avatars/avatar-6.jpg',
        isOnline: false,
        bikes: 3,
        miles: '18.9k',
        mutualFriends: 4,
        isRidingBuddy: false,
        distance: null
      }
    ],
    currentFilter: 'all'
  };

  // Store friends data globally
  window.friendsData = friendsData;

  // Setup event listeners
  setupFriendsEventListeners();
  
  // Initial render if on friends tab
  const friendsGrid = document.getElementById('friendsGrid');
  if (friendsGrid) {
    renderFriends(friendsData.friends);
  }
}

function setupFriendsEventListeners() {
  // Search functionality
  const searchInput = document.getElementById('friendsSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = window.friendsData.friends.filter(friend => 
        friend.name.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query) ||
        friend.bio.toLowerCase().includes(query)
      );
      renderFriends(filtered);
    });
  }

  // Filter buttons
  document.querySelectorAll('.friends-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.friends-filters .filter-btn').forEach(b => 
        b.classList.remove('active')
      );
      this.classList.add('active');
      
      const filter = this.dataset.filter;
      window.friendsData.currentFilter = filter;
      filterAndRenderFriends(filter);
    });
  });

  // Find friends button
  document.querySelector('.find-friends-btn')?.addEventListener('click', () => {
    console.log('Find friends clicked');
    // In a real app, this would open a friend discovery modal
  });

  // Friend actions
  document.addEventListener('click', (e) => {
    if (e.target.closest('.message-btn')) {
      const friendCard = e.target.closest('.friend-card');
      const friendId = friendCard.dataset.friendId;
      console.log('Message friend:', friendId);
      // In a real app, this would open a messaging interface
    }
    
    if (e.target.closest('.invite-btn')) {
      const friendCard = e.target.closest('.friend-card');
      const friendId = friendCard.dataset.friendId;
      console.log('Invite friend to ride:', friendId);
      // In a real app, this would open a ride invitation modal
    }
    
    if (e.target.closest('.more-btn')) {
      const friendCard = e.target.closest('.friend-card');
      const friendId = friendCard.dataset.friendId;
      console.log('More options for friend:', friendId);
      // In a real app, this would open a dropdown menu
    }
  });

  // Friend request actions
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-accept')) {
      const requestCard = e.target.closest('.pending-request-card');
      console.log('Accept friend request');
      // In a real app, this would accept the request and update the UI
      requestCard.style.opacity = '0.5';
      e.target.textContent = 'Accepted';
      e.target.disabled = true;
    }
    
    if (e.target.classList.contains('btn-decline')) {
      const requestCard = e.target.closest('.pending-request-card');
      console.log('Decline friend request');
      // In a real app, this would decline the request and update the UI
      requestCard.style.opacity = '0.5';
      e.target.textContent = 'Declined';
      e.target.disabled = true;
    }
  });
}

function filterAndRenderFriends(filter) {
  let filtered = [...window.friendsData.friends];
  
  switch(filter) {
    case 'riding-buddies':
      filtered = filtered.filter(f => f.isRidingBuddy);
      break;
    case 'recent':
      // In a real app, this would filter by recently added
      filtered = filtered.slice(0, 3);
      break;
    case 'online':
      filtered = filtered.filter(f => f.isOnline);
      break;
    case 'nearby':
      filtered = filtered.filter(f => f.distance !== null);
      break;
  }
  
  renderFriends(filtered);
}

function renderFriends(friends) {
  const friendsGrid = document.getElementById('friendsGrid');
  if (!friendsGrid) return;
  
  if (friends.length === 0) {
    friendsGrid.innerHTML = `
      <div class="empty-state">
        <p>No friends found matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  // We already have the friends rendered in the HTML,
  // but in a real app, you would dynamically generate them here
  // For now, we'll just show/hide based on the filter
  
  // This is a simplified version - in production, you'd generate the HTML
  console.log(`Showing ${friends.length} friends`);
}

// Garage view loading functions
function loadGarageGridView() {
  const gridContainer = document.getElementById('garageGrid');
  if (!gridContainer) return;
  
  // This would load bikes in a grid format
  console.log('Loading garage grid view...');
  // Implementation would populate the grid with bike cards
}

function loadGarageTimelineView() {
  const timelineContainer = document.getElementById('garageTimeline');
  if (!timelineContainer) return;
  
  // This would load bikes in a timeline format
  console.log('Loading garage timeline view...');
  // Implementation would create a timeline of bike ownership
}

// Global functions for garage showcase actions
window.viewBikeDetails = function(bikeId) {
  console.log('View bike details:', bikeId);
  window.location.href = `/bike-details/${bikeId}/`;
};

window.shareBike = function(bikeId) {
  console.log('Share bike:', bikeId);
  const bike = garageData.bikes.find(b => b.id === `bike-${bikeId}`);
  if (bike && navigator.share) {
    navigator.share({
      title: `${bike.year} ${bike.make} ${bike.model}`,
      text: `Check out my ${bike.nickname || bike.model} on BikeNode!`,
      url: window.location.href
    }).catch(console.error);
  } else {
    // Fallback - copy to clipboard
    navigator.clipboard.writeText(window.location.href);
    alert('Bike link copied to clipboard!');
  }
};

window.recordRide = function(bikeId) {
  console.log('Record ride for bike:', bikeId);
  window.location.href = `/record-ride/?bike=${bikeId}`;
};

// Activity Chart Initialization
function initializeActivityChart() {
  const canvas = document.getElementById('activityChart');
  if (!canvas || !canvas.getContext) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth;
  const height = canvas.height = 120;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Sample data for the last 30 days
  const data = generateSampleActivityData(30);
  
  // Calculate chart dimensions
  const padding = 20;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);
  const barWidth = chartWidth / data.length;
  
  // Find max value for scaling
  const maxValue = Math.max(...data.map(d => d.value));
  
  // Draw bars
  data.forEach((day, index) => {
    const barHeight = (day.value / maxValue) * chartHeight;
    const x = padding + (index * barWidth) + (barWidth * 0.1);
    const y = height - padding - barHeight;
    const barActualWidth = barWidth * 0.8;
    
    // Bar color based on activity level
    let color;
    if (day.value === 0) {
      color = 'rgba(255, 255, 255, 0.1)';
    } else if (day.value < 30) {
      color = 'rgba(88, 101, 242, 0.4)';
    } else if (day.value < 60) {
      color = 'rgba(88, 101, 242, 0.6)';
    } else {
      color = 'rgba(88, 101, 242, 0.8)';
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barActualWidth, barHeight);
  });
  
  // Draw axis lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  
  // X-axis
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  
  // Y-axis
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();
  
  // Add labels for first and last day
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('30d ago', padding, height - 5);
  ctx.textAlign = 'right';
  ctx.fillText('Today', width - padding, height - 5);
}

function generateSampleActivityData(days) {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Generate random activity (0-100 miles)
    // More likely to have activity on weekends
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hasActivity = Math.random() > (isWeekend ? 0.3 : 0.6);
    
    data.push({
      date: date,
      value: hasActivity ? Math.floor(Math.random() * 80) + 20 : 0
    });
  }
  
  return data;
}

// Time filter functionality for riding snapshot
document.addEventListener('DOMContentLoaded', () => {
  const timeFilter = document.querySelector('.time-filter');
  if (timeFilter) {
    timeFilter.addEventListener('change', (e) => {
      const period = e.target.value;
      updateRidingSnapshot(period);
    });
  }
});

function updateRidingSnapshot(period) {
  // In a real app, this would fetch data based on the selected period
  console.log('Updating riding snapshot for period:', period);
  
  // Update the chart
  initializeActivityChart();
  
  // You could also update the metrics here
  // For now, just log the action
}