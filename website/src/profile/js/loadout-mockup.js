// Enhanced Loadout System Mockup
// This demonstrates the UI/UX interactions for the RPG-style gear loadout

// Mock gear database with enhanced data
const mockGearDatabase = {
  helmets: [
    {
      id: 'helmet-shoei-rf1400',
      brand: 'Shoei',
      model: 'RF-1400',
      type: 'Full Face',
      price: 599,
      purchaseDate: '2024-01-15',
      condition: 'Excellent',
      mileage: 2500,
      protectionRating: 98,
      comfortRating: 4.5,
      ventilationRating: 5,
      noiseRating: 4,
      weight: '3.5 lbs',
      certifications: ['DOT', 'ECE 22.06', 'Snell M2020'],
      fitProfile: {
        overall: 'perfect',
        crown: 'perfect',
        cheeks: 'slightly-tight',
        jawline: 'perfect'
      },
      colors: ['Matte Black', 'Gloss White', 'Metallic Blue'],
      selectedColor: 'Matte Black',
      features: [
        'Emergency Quick Release System',
        'Pinlock EVO included',
        'Multiple shell sizes',
        'Removable liner'
      ],
      maintenanceLog: [
        { date: '2024-03-01', type: 'Visor cleaned', notes: 'Applied anti-fog coating' },
        { date: '2024-06-15', type: 'Liner washed', notes: 'Air dried for 24 hours' }
      ],
      crashHistory: [],
      userNotes: 'Best helmet I\'ve owned. Quiet at highway speeds, excellent ventilation.'
    },
    {
      id: 'helmet-arai-corsair',
      brand: 'Arai',
      model: 'Corsair-X',
      type: 'Full Face',
      price: 899,
      purchaseDate: '2023-06-20',
      condition: 'Good',
      mileage: 8500,
      protectionRating: 99,
      comfortRating: 5,
      ventilationRating: 4.5,
      noiseRating: 3.5,
      weight: '3.7 lbs',
      certifications: ['DOT', 'Snell M2020'],
      fitProfile: {
        overall: 'slightly-loose',
        crown: 'perfect',
        cheeks: 'loose',
        jawline: 'perfect'
      },
      crashHistory: [
        { 
          date: '2024-02-10', 
          severity: 'Minor', 
          speed: '25 mph',
          impactArea: 'Left side',
          performanceRating: 5,
          notes: 'Low-side at track day. Helmet performed perfectly, minimal cosmetic damage.'
        }
      ]
    }
  ],
  jackets: [
    {
      id: 'jacket-dainese-racing',
      brand: 'Dainese',
      model: 'Racing 3 D-Air',
      type: 'Leather Racing',
      price: 1699,
      purchaseDate: '2024-03-01',
      condition: 'Like New',
      protectionRating: 95,
      armor: {
        shoulders: 'Level 2',
        elbows: 'Level 2',
        back: 'Level 2 + D-Air Airbag',
        chest: 'Level 1'
      },
      fitProfile: {
        shoulders: 'perfect',
        chest: 'perfect',
        waist: 'slightly-loose',
        arms: 'perfect',
        back: 'perfect'
      },
      features: [
        'D-Air airbag system',
        'Perforated leather',
        'Aerodynamic hump',
        'Pant connection zipper'
      ],
      weatherRating: {
        hot: 4,
        warm: 5,
        cool: 3,
        cold: 2,
        rain: 2
      }
    }
  ],
  gloves: [
    {
      id: 'gloves-held-phantom',
      brand: 'Held',
      model: 'Phantom II',
      type: 'Sport/Track',
      price: 399,
      purchaseDate: '2024-04-10',
      condition: 'Good',
      protectionRating: 92,
      features: [
        'Kangaroo leather palms',
        'Carbon fiber knuckles',
        'SuperFabric panels',
        'Touchscreen compatible'
      ],
      fitProfile: {
        fingers: 'perfect',
        palm: 'perfect',
        wrist: 'slightly-tight'
      }
    }
  ],
  pants: [
    {
      id: 'pants-revit-apollo',
      brand: 'REV\'IT!',
      model: 'Apollo',
      type: 'Leather Racing',
      price: 799,
      purchaseDate: '2024-03-01',
      condition: 'Excellent',
      protectionRating: 88,
      armor: {
        hips: 'Level 2',
        knees: 'Level 2',
        shins: 'Integrated'
      },
      fitProfile: {
        waist: 'perfect',
        hips: 'perfect',
        thighs: 'slightly-tight',
        knees: 'perfect',
        calves: 'perfect'
      }
    }
  ],
  boots: [
    {
      id: 'boots-sidi-mag1',
      brand: 'Sidi',
      model: 'MAG-1 Air',
      type: 'Sport/Track',
      price: 549,
      purchaseDate: '2023-12-20',
      condition: 'Good',
      protectionRating: 94,
      features: [
        'Tecno 3 closure system',
        'Ankle brace system',
        'Replaceable toe sliders',
        'Perforated microfiber'
      ],
      fitProfile: {
        length: 'perfect',
        width: 'perfect',
        ankle: 'perfect',
        calf: 'slightly-loose'
      }
    }
  ]
};

// Loadout presets
const loadoutPresets = {
  track: {
    name: 'Track Day',
    description: 'Maximum protection for high-speed riding',
    gear: {
      helmet: 'helmet-shoei-rf1400',
      jacket: 'jacket-dainese-racing',
      gloves: 'gloves-held-phantom',
      pants: 'pants-revit-apollo',
      boots: 'boots-sidi-mag1'
    },
    requiredProtection: {
      head: 95,
      torso: 90,
      arms: 85,
      legs: 85
    }
  },
  touring: {
    name: 'Long Distance Touring',
    description: 'Comfort and versatility for all-day rides',
    gear: {
      helmet: 'helmet-modular-touring',
      jacket: 'jacket-textile-adventure',
      gloves: 'gloves-touring-gore',
      pants: 'pants-textile-adventure',
      boots: 'boots-touring-gore'
    }
  },
  commute: {
    name: 'Daily Commute',
    description: 'Practical protection for everyday riding',
    gear: {
      helmet: 'helmet-urban-jet',
      jacket: 'jacket-casual-armored',
      gloves: 'gloves-short-summer',
      pants: 'pants-riding-jeans',
      boots: 'boots-casual-moto'
    }
  }
};

// Gear comparison matrix
const gearComparison = {
  compareItems: (item1, item2) => {
    return {
      protection: {
        item1: item1.protectionRating,
        item2: item2.protectionRating,
        winner: item1.protectionRating > item2.protectionRating ? 'item1' : 'item2'
      },
      comfort: {
        item1: item1.comfortRating,
        item2: item2.comfortRating,
        winner: item1.comfortRating > item2.comfortRating ? 'item1' : 'item2'
      },
      value: {
        item1: (item1.protectionRating / item1.price) * 100,
        item2: (item2.protectionRating / item2.price) * 100,
        winner: ((item1.protectionRating / item1.price) > (item2.protectionRating / item2.price)) ? 'item1' : 'item2'
      }
    };
  }
};

// UI Enhancement Functions
function createGearCard(gear) {
  const conditionColors = {
    'Excellent': '#22c55e',
    'Like New': '#10b981',
    'Good': '#3b82f6',
    'Fair': '#f59e0b',
    'Poor': '#ef4444'
  };
  
  return `
    <div class="gear-detail-card">
      <div class="gear-header">
        <h4>${gear.brand} ${gear.model}</h4>
        <span class="condition-badge" style="background: ${conditionColors[gear.condition]}">${gear.condition}</span>
      </div>
      <div class="gear-stats-grid">
        <div class="stat">
          <span class="stat-icon">🛡️</span>
          <span class="stat-value">${gear.protectionRating}%</span>
          <span class="stat-label">Protection</span>
        </div>
        <div class="stat">
          <span class="stat-icon">📅</span>
          <span class="stat-value">${new Date(gear.purchaseDate).toLocaleDateString()}</span>
          <span class="stat-label">Purchased</span>
        </div>
        <div class="stat">
          <span class="stat-icon">🛣️</span>
          <span class="stat-value">${gear.mileage?.toLocaleString() || 'N/A'}</span>
          <span class="stat-label">Miles</span>
        </div>
      </div>
      ${gear.crashHistory?.length > 0 ? createCrashBadge(gear.crashHistory) : ''}
    </div>
  `;
}

function createCrashBadge(crashHistory) {
  return `
    <div class="crash-badge ${crashHistory.length > 0 ? 'has-crash' : ''}">
      <span class="crash-icon">⚠️</span>
      <span class="crash-text">${crashHistory.length} crash${crashHistory.length > 1 ? 'es' : ''} survived</span>
      <div class="crash-rating">
        Performance: ${crashHistory[0].performanceRating}/5 ⭐
      </div>
    </div>
  `;
}

function createFitVisualization(gearType, fitProfile) {
  const bodyParts = {
    helmet: ['crown', 'cheeks', 'jawline'],
    jacket: ['shoulders', 'chest', 'waist', 'arms', 'back'],
    gloves: ['fingers', 'palm', 'wrist'],
    pants: ['waist', 'hips', 'thighs', 'knees', 'calves'],
    boots: ['length', 'width', 'ankle', 'calf']
  };
  
  return `
    <svg class="fit-body-svg" viewBox="0 0 300 400">
      ${createBodyOutline(gearType)}
      ${bodyParts[gearType].map(part => createFitArea(part, fitProfile[part])).join('')}
    </svg>
  `;
}

function createBodyOutline(gearType) {
  const outlines = {
    helmet: '<ellipse cx="150" cy="100" rx="80" ry="100" fill="none" stroke="#666" stroke-width="2"/>',
    jacket: '<path d="M100,50 L100,200 L200,200 L200,50 M100,80 L50,80 L50,180 M200,80 L250,80 L250,180" fill="none" stroke="#666" stroke-width="2"/>',
    gloves: '<path d="M100,100 L100,200 L150,200 L150,100 M110,100 L110,80 M130,100 L130,70 M140,100 L140,75" fill="none" stroke="#666" stroke-width="2"/>',
    pants: '<path d="M120,50 L120,200 L100,350 M180,50 L180,200 L200,350 M120,50 L180,50" fill="none" stroke="#666" stroke-width="2"/>',
    boots: '<path d="M100,100 L100,250 L150,250 L150,240 L140,100" fill="none" stroke="#666" stroke-width="2"/>'
  };
  return outlines[gearType] || '';
}

function createFitArea(part, fitStatus) {
  const positions = {
    // Helmet positions
    crown: { x: 150, y: 60, r: 40 },
    cheeks: { x: 150, y: 120, r: 50 },
    jawline: { x: 150, y: 160, r: 30 },
    // Jacket positions
    shoulders: { x: 100, y: 80, w: 100, h: 30 },
    chest: { x: 120, y: 120, w: 60, h: 40 },
    waist: { x: 130, y: 170, w: 40, h: 30 },
    arms: { x: 50, y: 100, w: 40, h: 60 },
    back: { x: 140, y: 100, w: 20, h: 80 }
  };
  
  const pos = positions[part];
  if (!pos) return '';
  
  const fitColors = {
    'perfect': '#22c55e',
    'slightly-tight': '#f59e0b',
    'slightly-loose': '#3b82f6',
    'tight': '#ef4444',
    'loose': '#dc2626'
  };
  
  const color = fitColors[fitStatus] || '#666';
  
  if (pos.r) {
    return `<circle cx="${pos.x}" cy="${pos.y}" r="${pos.r}" fill="${color}" opacity="0.3" class="fit-area" data-part="${part}"/>`;
  } else {
    return `<rect x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" fill="${color}" opacity="0.3" class="fit-area" data-part="${part}"/>`;
  }
}

// Interactive Features
function setupDragAndDrop() {
  // Make collection items draggable
  document.querySelectorAll('.collection-item').forEach(item => {
    item.draggable = true;
    
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('gearId', item.dataset.itemId);
      item.classList.add('dragging');
    });
    
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  });
  
  // Make gear slots droppable
  document.querySelectorAll('.gear-slot-item').forEach(slot => {
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });
    
    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });
    
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      const gearId = e.dataTransfer.getData('gearId');
      slot.classList.remove('drag-over');
      // Handle gear equipping
      console.log(`Equipping ${gearId} to ${slot.dataset.slot}`);
    });
  });
}

// Gear Recommendations
function getGearRecommendations(userMeasurements, gearType) {
  const recommendations = {
    helmet: {
      small: { circumference: [53, 54], brands: ['Arai', 'Shoei', 'AGV'] },
      medium: { circumference: [55, 56, 57, 58], brands: ['All brands'] },
      large: { circumference: [59, 60], brands: ['HJC', 'Shark', 'Scorpion'] },
      xlarge: { circumference: [61, 62, 63], brands: ['HJC', 'Icon', 'Bell'] }
    },
    jacket: {
      sizing: {
        chest: userMeasurements.chest,
        recommended: calculateJacketSize(userMeasurements)
      }
    }
  };
  
  return recommendations[gearType];
}

function calculateJacketSize(measurements) {
  const chest = measurements.chest;
  if (chest < 36) return 'XS (34-36)';
  if (chest < 38) return 'S (36-38)';
  if (chest < 40) return 'M (38-40)';
  if (chest < 42) return 'L (40-42)';
  if (chest < 44) return 'XL (42-44)';
  return 'XXL (44+)';
}

// Export for use in other files
window.mockGearSystem = {
  database: mockGearDatabase,
  presets: loadoutPresets,
  comparison: gearComparison,
  createGearCard,
  createFitVisualization,
  setupDragAndDrop,
  getGearRecommendations
};