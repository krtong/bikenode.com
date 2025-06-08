// Profile Content Population Script
// This script populates all the empty sections with rich content

// Initialize profile content when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    populateRides();
    populateAchievements();
    populatePosts();
    populateInventory();
    populateCommunities();
    updateProfileAvatar();
    createIconElements();
});

// Update profile avatar from blank helmet to actual user avatar
function updateProfileAvatar() {
    const avatarImg = document.querySelector('.avatar-img');
    if (avatarImg) {
        // Use the DALL-E generated profile avatar instead of blank helmet
        avatarImg.src = '/profile/images/nerd_blank_profile.png';
        avatarImg.alt = 'Kevin Tong Profile Avatar';
    }
}

// Replace emoji icons with SVG icons
function createIconElements() {
    const iconMap = {
        '📷': createCameraIcon(),
        '✏️': createEditIcon(),
        '⋯': createMoreIcon(),
        '🏠': createHomeIcon(),
        '🏍️': createBikeIcon(),
        '👕': createGearIcon(),
        '🎒': createBackpackIcon(),
        '🚴': createRideIcon(),
        '🏆': createTrophyIcon(),
        '📝': createPostIcon(),
        '👥': createCommunityIcon(),
        '📍': createLocationIcon(),
        '📅': createCalendarIcon(),
        '🔗': createLinkIcon(),
        '📤': createShareIcon(),
        '➕': createPlusIcon(),
        '💾': createSaveIcon(),
        '⊞': createGridIcon(),
        '☰': createListIcon()
    };

    // Replace all emoji icons with SVG versions
    document.querySelectorAll('.icon').forEach(iconEl => {
        const emoji = iconEl.textContent.trim();
        if (iconMap[emoji]) {
            iconEl.innerHTML = iconMap[emoji];
            iconEl.classList.add('svg-icon');
        }
    });
}

// Populate Rides section with enhanced ride data
function populateRides() {
    const ridesList = document.querySelector('.rides-list');
    if (!ridesList) return;

    const rides = [
        {
            id: 1,
            title: "Pacific Coast Highway Epic",
            date: "2025-06-06",
            distance: "156 miles",
            duration: "4h 32m",
            elevation: "8,234 ft",
            bike: "2025 Yamaha R1",
            route: "San Francisco → Half Moon Bay → Santa Cruz",
            avgSpeed: "34.4 mph",
            maxSpeed: "112 mph",
            weather: "Sunny, 72°F",
            type: "Coastal Ride",
            mapImage: "/profile/images/rides/pch-map.svg",
            photos: ["/profile/images/rides/pch-1.jpg", "/profile/images/rides/pch-2.jpg"],
            kudos: 45,
            comments: 12,
            zones: [15, 25, 35, 20, 5] // Percentage in each power zone
        },
        {
            id: 2,
            title: "Napa Valley Wine Country Tour",
            date: "2025-06-04",
            distance: "212 miles",
            duration: "5h 18m",
            elevation: "6,789 ft",
            bike: "2024 Ducati V4S",
            route: "SF → Napa → Calistoga → Healdsburg → SF",
            avgSpeed: "40.0 mph",
            maxSpeed: "95 mph",
            weather: "Partly Cloudy, 68°F",
            type: "Touring",
            mapImage: "/profile/images/rides/napa-map.svg",
            photos: ["/profile/images/rides/napa-1.jpg"],
            kudos: 67,
            comments: 23,
            zones: [20, 30, 30, 15, 5]
        },
        {
            id: 3,
            title: "Mt. Tamalpais Sunrise Run",
            date: "2025-06-02",
            distance: "78 miles",
            duration: "2h 15m",
            elevation: "4,567 ft",
            bike: "2023 Honda CBR1000RR",
            route: "Mill Valley → Mt. Tam → Stinson Beach",
            avgSpeed: "34.7 mph",
            maxSpeed: "78 mph",
            weather: "Foggy, 58°F",
            type: "Mountain Climb",
            mapImage: "/profile/images/rides/tam-map.svg",
            photos: [],
            kudos: 34,
            comments: 8,
            zones: [10, 20, 40, 25, 5]
        },
        {
            id: 4,
            title: "Track Day at Laguna Seca",
            date: "2025-05-28",
            distance: "145 miles",
            duration: "6h 30m",
            elevation: "2,345 ft",
            bike: "2025 Yamaha R1",
            route: "20 laps on track + travel",
            avgSpeed: "85.2 mph",
            maxSpeed: "168 mph",
            weather: "Perfect, 75°F",
            type: "Track Day",
            mapImage: "/profile/images/rides/laguna-map.svg",
            photos: ["/profile/images/rides/track-1.jpg", "/profile/images/rides/track-2.jpg", "/profile/images/rides/track-3.jpg"],
            kudos: 123,
            comments: 45,
            zones: [5, 10, 25, 35, 25]
        }
    ];

    // Get current view mode
    const viewMode = ridesList.classList.contains('grid-view') ? 'grid' : 'list';

    ridesList.innerHTML = rides.map(ride => `
        <div class="ride-card" data-ride-id="${ride.id}">
            <!-- Map Preview -->
            <div class="ride-map-preview">
                <img src="${ride.mapImage || '/profile/images/rides/default-map.svg'}" alt="${ride.title} map">
                <div class="ride-map-overlay">
                    <span class="ride-type-badge">${ride.type}</span>
                </div>
            </div>

            <div class="ride-card-content">
                <div class="ride-header">
                    <div class="ride-title-section">
                        <h4 class="ride-title">${ride.title}</h4>
                        <p class="ride-date">${formatDate(ride.date)}</p>
                    </div>
                    <div class="ride-bike">${ride.bike}</div>
                </div>

                <div class="ride-stats">
                    <div class="ride-stat">
                        <span class="stat-icon">${createDistanceIcon()}</span>
                        <div class="stat-details">
                            <span class="stat-value">${ride.distance}</span>
                            <span class="stat-label">Distance</span>
                        </div>
                    </div>
                    <div class="ride-stat">
                        <span class="stat-icon">${createClockIcon()}</span>
                        <div class="stat-details">
                            <span class="stat-value">${ride.duration}</span>
                            <span class="stat-label">Duration</span>
                        </div>
                    </div>
                    <div class="ride-stat">
                        <span class="stat-icon">${createMountainIcon()}</span>
                        <div class="stat-details">
                            <span class="stat-value">${ride.elevation}</span>
                            <span class="stat-label">Elevation</span>
                        </div>
                    </div>
                    <div class="ride-stat">
                        <span class="stat-icon">${createSpeedIcon()}</span>
                        <div class="stat-details">
                            <span class="stat-value">${ride.avgSpeed}</span>
                            <span class="stat-label">Avg Speed</span>
                        </div>
                    </div>
                </div>

                <div class="ride-route">
                    <span class="route-icon">${createRouteIcon()}</span>
                    <span class="route-text">${ride.route}</span>
                </div>

                <!-- Zone Distribution -->
                <div class="zone-distribution">
                    ${ride.zones.map((percent, index) => `
                        <div class="zone-bar zone-${index + 1}" style="flex: ${percent};" title="Zone ${index + 1}: ${percent}%"></div>
                    `).join('')}
                </div>

                <!-- Photos Strip (if any) -->
                ${ride.photos.length > 0 ? `
                    <div class="ride-photos">
                        ${ride.photos.map(photo => `
                            <div class="ride-photo">
                                <img src="${photo}" alt="Ride photo">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Social Stats -->
                <div class="ride-social">
                    <div class="social-stat" onclick="toggleKudos(${ride.id})">
                        <span class="social-icon">${createKudosIcon()}</span>
                        <span>${ride.kudos} kudos</span>
                    </div>
                    <div class="social-stat" onclick="viewComments(${ride.id})">
                        <span class="social-icon">${createCommentIcon()}</span>
                        <span>${ride.comments} comments</span>
                    </div>
                </div>

                <div class="ride-footer">
                    <div class="ride-weather">
                        <span class="weather-icon">${createWeatherIcon()}</span>
                        <span>${ride.weather}</span>
                    </div>
                    <div class="ride-actions">
                        <button class="ride-action-btn" onclick="viewRideDetails(${ride.id})">View Details</button>
                        <button class="ride-action-btn" onclick="shareRide(${ride.id})">Share</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Initialize ride card interactions
    initializeRideInteractions();
}

// Populate Achievements section
function populateAchievements() {
    const achievementsGrid = document.querySelector('.achievements-grid');
    if (!achievementsGrid) return;

    const achievements = [
        {
            title: "Speed Demon",
            description: "Reached 150+ mph on track",
            icon: createSpeedAchievementIcon(),
            date: "2025-05-28",
            rarity: "epic"
        },
        {
            title: "Century Rider",
            description: "Completed a 100+ mile ride",
            icon: createDistanceAchievementIcon(),
            date: "2025-06-06",
            rarity: "rare"
        },
        {
            title: "Mountain Goat",
            description: "Climbed 10,000+ ft in one ride",
            icon: createClimbingAchievementIcon(),
            date: "2025-05-15",
            rarity: "rare"
        },
        {
            title: "Early Bird",
            description: "Started 10 rides before sunrise",
            icon: createSunriseAchievementIcon(),
            date: "2025-06-02",
            rarity: "common"
        },
        {
            title: "Track Master",
            description: "Completed 50 track sessions",
            icon: createTrackAchievementIcon(),
            date: "2025-05-28",
            rarity: "legendary"
        },
        {
            title: "Gear Collector",
            description: "Own 20+ pieces of riding gear",
            icon: createGearAchievementIcon(),
            date: "2025-04-20",
            rarity: "rare"
        },
        {
            title: "Social Butterfly",
            description: "Joined 5+ riding communities",
            icon: createSocialAchievementIcon(),
            date: "2025-03-10",
            rarity: "common"
        },
        {
            title: "Weather Warrior",
            description: "Rode in rain 10 times",
            icon: createWeatherAchievementIcon(),
            date: "2025-02-28",
            rarity: "rare"
        }
    ];

    achievementsGrid.innerHTML = achievements.map(achievement => `
        <div class="achievement-card ${achievement.rarity}">
            <div class="achievement-icon">
                ${achievement.icon}
            </div>
            <div class="achievement-details">
                <h4 class="achievement-title">${achievement.title}</h4>
                <p class="achievement-description">${achievement.description}</p>
                <span class="achievement-date">Earned ${formatDate(achievement.date)}</span>
            </div>
            <div class="achievement-rarity">${achievement.rarity.toUpperCase()}</div>
        </div>
    `).join('');
}

// Populate Posts section
function populatePosts() {
    const postsList = document.querySelector('.posts-list');
    if (!postsList) return;

    const posts = [
        {
            title: "Track Day Tips for Beginners",
            excerpt: "After 50+ track days, here are my top tips for riders looking to improve their skills safely...",
            date: "2025-06-01",
            readTime: "8 min read",
            likes: 234,
            comments: 45,
            image: "/profile/images/bikes/yamaha-r1.jpg"
        },
        {
            title: "Best Motorcycle Roads in Northern California",
            excerpt: "From coastal highways to mountain passes, these are the roads every rider needs to experience...",
            date: "2025-05-20",
            readTime: "12 min read",
            likes: 567,
            comments: 89,
            image: "/profile/images/profile-cover-default.jpg"
        },
        {
            title: "2025 Yamaha R1 Review: 6 Months Later",
            excerpt: "My honest thoughts after putting 8,000 miles on Yamaha's flagship superbike...",
            date: "2025-05-10",
            readTime: "15 min read",
            likes: 892,
            comments: 127,
            image: "/profile/images/bikes/yamaha-r1.jpg"
        }
    ];

    postsList.innerHTML = posts.map(post => `
        <article class="post-card">
            <div class="post-image">
                <img src="${post.image}" alt="${post.title}">
            </div>
            <div class="post-content">
                <h4 class="post-title">${post.title}</h4>
                <p class="post-excerpt">${post.excerpt}</p>
                <div class="post-meta">
                    <span class="post-date">${formatDate(post.date)}</span>
                    <span class="post-divider">•</span>
                    <span class="post-read-time">${post.readTime}</span>
                </div>
                <div class="post-engagement">
                    <div class="engagement-stat">
                        <span class="stat-icon">${createHeartIcon()}</span>
                        <span>${post.likes}</span>
                    </div>
                    <div class="engagement-stat">
                        <span class="stat-icon">${createCommentIcon()}</span>
                        <span>${post.comments}</span>
                    </div>
                    <button class="post-action-btn">Read More</button>
                </div>
            </div>
        </article>
    `).join('');
}

// Populate Inventory section
function populateInventory() {
    const inventoryData = {
        tools: [
            { name: "Torque Wrench Set", brand: "Tekton", quantity: 1 },
            { name: "Chain Cleaning Kit", brand: "DID", quantity: 1 },
            { name: "Tire Pressure Gauge", brand: "Motion Pro", quantity: 2 },
            { name: "Multi-tool", brand: "Leatherman", quantity: 1 }
        ],
        electronics: [
            { name: "Cardo Packtalk Bold", brand: "Cardo", quantity: 1 },
            { name: "GoPro Hero 11", brand: "GoPro", quantity: 2 },
            { name: "Garmin Zumo XT", brand: "Garmin", quantity: 1 },
            { name: "USB Charger", brand: "RAM Mount", quantity: 1 }
        ],
        bags: [
            { name: "Tank Bag", brand: "SW-Motech", quantity: 1 },
            { name: "Tail Bag", brand: "Kriega", quantity: 1 },
            { name: "Saddlebags", brand: "Givi", quantity: 1 },
            { name: "Backpack", brand: "Ogio", quantity: 2 }
        ],
        hydration: [
            { name: "Hydration Pack", brand: "CamelBak", quantity: 1 },
            { name: "Water Bottles", brand: "Nalgene", quantity: 3 }
        ],
        nutrition: [
            { name: "Energy Bars", brand: "Clif", quantity: 12 },
            { name: "Electrolyte Mix", brand: "Nuun", quantity: 20 },
            { name: "Trail Mix", brand: "Various", quantity: 5 }
        ],
        safety: [
            { name: "First Aid Kit", brand: "Adventure Medical", quantity: 1 },
            { name: "Emergency Tool Kit", brand: "CruzTools", quantity: 1 },
            { name: "Tire Repair Kit", brand: "Stop & Go", quantity: 1 },
            { name: "Hi-Viz Vest", brand: "Icon", quantity: 1 }
        ]
    };

    // Populate each category
    Object.keys(inventoryData).forEach(category => {
        const container = document.getElementById(`${category}Inventory`);
        if (container) {
            container.innerHTML = inventoryData[category].map(item => `
                <div class="inventory-item">
                    <div class="item-icon">${getCategoryIcon(category)}</div>
                    <div class="item-details">
                        <h5>${item.name}</h5>
                        <p>${item.brand}</p>
                    </div>
                    <div class="item-quantity">
                        <span class="quantity-badge">×${item.quantity}</span>
                    </div>
                </div>
            `).join('');
        }
    });
}

// Populate Communities section
function populateCommunities() {
    const communitiesGrid = document.querySelector('.communities-grid');
    if (!communitiesGrid) return;

    const communities = [
        {
            name: "Bay Area Sport Riders",
            members: "2.3k",
            role: "Moderator",
            activity: "Very Active",
            icon: "🏍️"
        },
        {
            name: "Track Day Addicts",
            members: "892",
            role: "Admin",
            activity: "Active",
            icon: "🏁"
        },
        {
            name: "Motorcycle Photography",
            members: "5.1k",
            role: "Member",
            activity: "Active",
            icon: "📸"
        },
        {
            name: "R1 Owners Club",
            members: "1.2k",
            role: "Member",
            activity: "Moderate",
            icon: "🔧"
        }
    ];

    communitiesGrid.innerHTML = communities.map(community => `
        <div class="community-card">
            <div class="community-icon">${community.icon}</div>
            <h4 class="community-name">${community.name}</h4>
            <div class="community-stats">
                <span class="member-count">${community.members} members</span>
                <span class="activity-level">${community.activity}</span>
            </div>
            <div class="community-role">Role: ${community.role}</div>
            <button class="community-action-btn">Visit Community</button>
        </div>
    `).join('');
}

// Helper Functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

// SVG Icon Creation Functions
function createCameraIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
    </svg>`;
}

function createEditIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>`;
}

function createMoreIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="1"/>
        <circle cx="12" cy="5" r="1"/>
        <circle cx="12" cy="19" r="1"/>
    </svg>`;
}

function createHomeIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>`;
}

function createBikeIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="5" cy="18" r="3"/>
        <circle cx="19" cy="18" r="3"/>
        <path d="M12 2v4m0 0l-3 9h6l-3-9zm-3 9l-4 2m10-2l4 2"/>
    </svg>`;
}

function createGearIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/>
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>`;
}

function createBackpackIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z"/>
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <path d="M8 12h8"/>
    </svg>`;
}

function createRideIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16v-2a4 4 0 0 0-4-4h-2m-1 0H6a4 4 0 0 0-4 4v2"/>
        <circle cx="5" cy="18" r="3"/>
        <circle cx="19" cy="18" r="3"/>
        <path d="M15 6h-1a4 4 0 0 0-4 4v1"/>
    </svg>`;
}

function createTrophyIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M6 2h12v10a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V2z"/>
        <path d="M12 18v4"/>
        <path d="M8 22h8"/>
    </svg>`;
}

function createPostIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
    </svg>`;
}

function createCommunityIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`;
}

function createLocationIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
    </svg>`;
}

function createCalendarIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>`;
}

function createLinkIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>`;
}

function createShareIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>`;
}

function createPlusIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`;
}

function createSaveIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
    </svg>`;
}

function createGridIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
    </svg>`;
}

function createListIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>`;
}

// Additional icons for rides and achievements
function createDistanceIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>`;
}

function createClockIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>`;
}

function createMountainIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
    </svg>`;
}

function createSpeedIcon() {
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v4"/>
        <path d="m4.93 4.93 2.83 2.83"/>
        <path d="M2 12h4"/>
        <path d="m4.93 19.07 2.83-2.83"/>
        <path d="m19.07 4.93-2.83 2.83"/>
        <path d="M22 12h-4"/>
        <path d="m19.07 19.07-2.83-2.83"/>
        <circle cx="12" cy="12" r="4"/>
    </svg>`;
}

function createRouteIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="6" cy="6" r="3"/>
        <circle cx="6" cy="18" r="3"/>
        <path d="M6 9v6"/>
        <path d="m21 3-8.5 8.5"/>
        <path d="m15 3 6 6"/>
    </svg>`;
}

function createWeatherIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>`;
}

function createHeartIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>`;
}

function createCommentIcon() {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>`;
}

// Achievement icons
function createSpeedAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" opacity="0.3"/>
        <path d="M24 8v8M8 24h8M40 24h-8M24 40v-8" stroke="currentColor" stroke-width="3"/>
        <circle cx="24" cy="24" r="6" fill="currentColor"/>
    </svg>`;
}

function createDistanceAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M12 8L24 32L36 8" stroke="currentColor" stroke-width="3"/>
        <path d="M8 40h32" stroke="currentColor" stroke-width="2" opacity="0.5"/>
    </svg>`;
}

function createClimbingAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M8 40L18 20L28 28L40 8" stroke="currentColor" stroke-width="3"/>
        <circle cx="40" cy="8" r="4" fill="currentColor"/>
    </svg>`;
}

function createSunriseAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M24 16a8 8 0 0 1 8 8H16a8 8 0 0 1 8-8z" fill="currentColor" opacity="0.3"/>
        <path d="M24 4v4M12 12l2.8 2.8M4 24h4M36 12l-2.8 2.8M44 24h-4" stroke="currentColor" stroke-width="2"/>
        <path d="M8 32h32" stroke="currentColor" stroke-width="3"/>
    </svg>`;
}

function createTrackAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="8" width="32" height="32" rx="16" stroke="currentColor" stroke-width="3" fill="none"/>
        <path d="M24 16v8l6 6" stroke="currentColor" stroke-width="2"/>
        <circle cx="24" cy="24" r="2" fill="currentColor"/>
    </svg>`;
}

function createGearAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2"/>
        <path d="M24 8v8M24 32v8M8 24h8M32 24h8" stroke="currentColor" stroke-width="3"/>
        <circle cx="24" cy="24" r="4" fill="currentColor"/>
    </svg>`;
}

function createSocialAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="16" cy="20" r="6" stroke="currentColor" stroke-width="2"/>
        <circle cx="32" cy="20" r="6" stroke="currentColor" stroke-width="2"/>
        <path d="M24 36a12 12 0 0 0-12-12M24 36a12 12 0 0 1 12-12" stroke="currentColor" stroke-width="2"/>
    </svg>`;
}

function createWeatherAchievementIcon() {
    return `<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path d="M32 16h-2a8 8 0 1 0-14 8h16a6 6 0 0 0 0-12z" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M16 32l2 4M24 32l2 4M32 32l2 4" stroke="currentColor" stroke-width="2"/>
    </svg>`;
}

// Additional icon for kudos
function createKudosIcon() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
    </svg>`;
}

// Category icons for inventory
function getCategoryIcon(category) {
    const icons = {
        tools: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>`,
        electronics: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
            <rect x="9" y="9" width="6" height="6"/>
            <line x1="9" y1="1" x2="9" y2="4"/>
            <line x1="15" y1="1" x2="15" y2="4"/>
            <line x1="9" y1="20" x2="9" y2="23"/>
            <line x1="15" y1="20" x2="15" y2="23"/>
            <line x1="20" y1="9" x2="23" y2="9"/>
            <line x1="20" y1="14" x2="23" y2="14"/>
            <line x1="1" y1="9" x2="4" y2="9"/>
            <line x1="1" y1="14" x2="4" y2="14"/>
        </svg>`,
        bags: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z"/>
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>`,
        hydration: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l7.5 10.5a7.5 7.5 0 1 1-15 0L12 2z"/>
        </svg>`,
        nutrition: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 2v7L4 2M9 9h13M9 9a3 3 0 0 0 0 6h9a3 3 0 0 0 0-6"/>
        </svg>`,
        safety: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l8 3v10a8 8 0 0 1-8 8 8 8 0 0 1-8-8V5l8-3z"/>
            <path d="M9 12l2 2 4-4"/>
        </svg>`
    };
    return icons[category] || '';
}

// Ride interaction functions
function initializeRideInteractions() {
    // View toggle functionality
    const viewButtons = document.querySelectorAll('.view-toggle-rides .view-btn');
    const ridesList = document.querySelector('.rides-list');
    
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.view === 'grid') {
                ridesList.classList.add('grid-view');
            } else {
                ridesList.classList.remove('grid-view');
            }
        });
    });

    // Filter and sort functionality
    const timeFilter = document.getElementById('ridesTimeFilter');
    const sortFilter = document.getElementById('ridesSort');
    
    if (timeFilter) {
        timeFilter.addEventListener('change', () => {
            filterRides(timeFilter.value, sortFilter.value);
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            filterRides(timeFilter.value, sortFilter.value);
        });
    }

    // Load more functionality
    const loadMoreBtn = document.getElementById('loadMoreRides');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreRides);
    }
}

// Global functions for ride interactions (called from onclick handlers)
window.toggleKudos = function(rideId) {
    console.log('Toggle kudos for ride:', rideId);
    // Implementation would update kudos count and state
};

window.viewComments = function(rideId) {
    console.log('View comments for ride:', rideId);
    // Implementation would open comments modal
};

window.viewRideDetails = function(rideId) {
    console.log('View details for ride:', rideId);
    // Implementation would navigate to ride details page
    window.location.href = `/ride-details/${rideId}/`;
};

window.shareRide = function(rideId) {
    console.log('Share ride:', rideId);
    // Implementation would open share modal
};

function filterRides(timeFilter, sortBy) {
    console.log('Filter rides:', timeFilter, sortBy);
    // Implementation would filter and sort rides
}

function loadMoreRides() {
    console.log('Loading more rides...');
    // Implementation would load additional rides
}