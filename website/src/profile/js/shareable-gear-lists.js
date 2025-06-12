// Shareable Gear Lists System
// Allows users to create, save, and share gear lists for different ride types

const shareableGearLists = {
  // Predefined ride types with suggested gear
  rideTypes: {
    trackDay: {
      name: 'Track Day',
      icon: '🏁',
      requiredGear: ['helmet', 'jacket', 'gloves', 'pants', 'boots'],
      optionalGear: ['backProtector', 'chestProtector', 'kneePucks'],
      description: 'Maximum protection for high-speed circuit riding'
    },
    touring: {
      name: 'Long Distance Touring',
      icon: '🛣️',
      requiredGear: ['helmet', 'jacket', 'gloves', 'pants', 'boots'],
      optionalGear: ['rainGear', 'hydrationPack', 'luggageSystem'],
      description: 'Comfort and versatility for multi-day adventures'
    },
    commute: {
      name: 'Daily Commute',
      icon: '🏢',
      requiredGear: ['helmet', 'jacket', 'gloves'],
      optionalGear: ['pants', 'boots', 'backpack'],
      description: 'Practical protection for everyday riding'
    },
    canyon: {
      name: 'Canyon Carving',
      icon: '⛰️',
      requiredGear: ['helmet', 'jacket', 'gloves', 'pants', 'boots'],
      optionalGear: ['actionCamera', 'communicationSystem'],
      description: 'Spirited riding through twisty mountain roads'
    },
    dirtBike: {
      name: 'Off-Road/Dirt',
      icon: '🏔️',
      requiredGear: ['dirtHelmet', 'jersey', 'gloves', 'pants', 'boots'],
      optionalGear: ['goggles', 'chestProtector', 'kneeGuards'],
      description: 'Adventure and enduro off-road riding'
    }
  },
  
  // Create a new gear list
  createGearList(name, rideType, gearItems, notes) {
    const listId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const shareCode = this.generateShareCode();
    
    const gearList = {
      id: listId,
      name,
      rideType,
      shareCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      gearItems,
      notes,
      views: 0,
      likes: 0
    };
    
    // Save to storage (in real app, this would be database)
    this.saveGearList(gearList);
    
    return gearList;
  },
  
  // Generate unique share code
  generateShareCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },
  
  // Save gear list
  saveGearList(gearList) {
    const lists = this.getGearLists();
    lists.push(gearList);
    localStorage.setItem('gearLists', JSON.stringify(lists));
  },
  
  // Get all gear lists
  getGearLists() {
    const lists = localStorage.getItem('gearLists');
    return lists ? JSON.parse(lists) : [];
  },
  
  // Get gear list by share code
  getGearListByShareCode(shareCode) {
    const lists = this.getGearLists();
    return lists.find(list => list.shareCode === shareCode);
  },
  
  // Update gear list
  updateGearList(listId, updates) {
    const lists = this.getGearLists();
    const index = lists.findIndex(list => list.id === listId);
    
    if (index !== -1) {
      lists[index] = {
        ...lists[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('gearLists', JSON.stringify(lists));
      return lists[index];
    }
    return null;
  },
  
  // Delete gear list
  deleteGearList(listId) {
    const lists = this.getGearLists();
    const filtered = lists.filter(list => list.id !== listId);
    localStorage.setItem('gearLists', JSON.stringify(filtered));
  },
  
  // Generate shareable URL
  generateShareUrl(shareCode) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/gear-list/${shareCode}`;
  },
  
  // Generate QR code for sharing
  generateQRCode(shareUrl) {
    // In a real app, use a QR code library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
  },
  
  // Export gear list as JSON
  exportAsJSON(gearList) {
    const data = {
      name: gearList.name,
      rideType: gearList.rideType,
      created: gearList.createdAt,
      gear: gearList.gearItems,
      notes: gearList.notes
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gear-list-${gearList.shareCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Export gear list as PDF (placeholder)
  exportAsPDF(gearList) {
    // In a real app, use a PDF generation library
    console.log('PDF export would be implemented here', gearList);
    alert('PDF export feature coming soon!');
  },
  
  // Calculate total weight of gear list
  calculateTotalWeight(gearItems) {
    return gearItems.reduce((total, item) => {
      return total + (item.weight || 0);
    }, 0);
  },
  
  // Calculate total value of gear list
  calculateTotalValue(gearItems) {
    return gearItems.reduce((total, item) => {
      return total + (item.price || 0);
    }, 0);
  },
  
  // Get gear list statistics
  getGearListStats(gearList) {
    const totalWeight = this.calculateTotalWeight(gearList.gearItems);
    const totalValue = this.calculateTotalValue(gearList.gearItems);
    const avgProtection = gearList.gearItems.reduce((sum, item) => {
      return sum + (item.protectionRating || 0);
    }, 0) / gearList.gearItems.length;
    
    return {
      itemCount: gearList.gearItems.length,
      totalWeight: totalWeight.toFixed(1),
      totalValue: totalValue.toFixed(2),
      avgProtection: Math.round(avgProtection)
    };
  }
};

// UI Component for gear list creation
class GearListCreator {
  constructor(containerElement, userGearCollection) {
    this.container = containerElement;
    this.userGear = userGearCollection;
    this.selectedItems = new Set();
    this.render();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="gear-list-creator">
        <h3>Create Shareable Gear List</h3>
        
        <div class="list-details">
          <input type="text" 
                 id="listName" 
                 placeholder="Name your gear list..." 
                 class="list-name-input">
          
          <select id="rideType" class="ride-type-select">
            <option value="">Select ride type...</option>
            ${Object.entries(shareableGearLists.rideTypes).map(([key, type]) => `
              <option value="${key}">${type.icon} ${type.name}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="gear-selection">
          <h4>Select Gear Items</h4>
          <div class="gear-grid">
            ${this.userGear.map(item => `
              <div class="gear-select-item" data-item-id="${item.id}">
                <input type="checkbox" 
                       id="gear-${item.id}" 
                       value="${item.id}"
                       onchange="gearListCreator.toggleItem('${item.id}')">
                <label for="gear-${item.id}">
                  <img src="${item.image || '/assets/images/gear-placeholder.png'}" 
                       alt="${item.model}">
                  <span class="item-name">${item.brand} ${item.model}</span>
                </label>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="list-notes">
          <textarea id="listNotes" 
                    placeholder="Add notes about this gear setup..."
                    rows="4"></textarea>
        </div>
        
        <div class="selected-count">
          <span id="selectedCount">0</span> items selected
        </div>
        
        <div class="list-actions">
          <button class="btn-primary" onclick="gearListCreator.createList()">
            Create & Share List
          </button>
          <button class="btn-secondary" onclick="gearListCreator.cancel()">
            Cancel
          </button>
        </div>
      </div>
    `;
  }
  
  toggleItem(itemId) {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
    this.updateSelectedCount();
  }
  
  updateSelectedCount() {
    document.getElementById('selectedCount').textContent = this.selectedItems.size;
  }
  
  createList() {
    const name = document.getElementById('listName').value;
    const rideType = document.getElementById('rideType').value;
    const notes = document.getElementById('listNotes').value;
    
    if (!name || !rideType || this.selectedItems.size === 0) {
      alert('Please fill in all required fields and select at least one gear item.');
      return;
    }
    
    const selectedGear = this.userGear.filter(item => 
      this.selectedItems.has(item.id)
    );
    
    const gearList = shareableGearLists.createGearList(
      name,
      rideType,
      selectedGear,
      notes
    );
    
    this.showShareModal(gearList);
  }
  
  showShareModal(gearList) {
    const shareUrl = shareableGearLists.generateShareUrl(gearList.shareCode);
    const qrCodeUrl = shareableGearLists.generateQRCode(shareUrl);
    const stats = shareableGearLists.getGearListStats(gearList);
    
    const modal = document.createElement('div');
    modal.className = 'share-modal active';
    modal.innerHTML = `
      <div class="share-modal-content">
        <h3>Gear List Created!</h3>
        
        <div class="share-code-display">
          <p>Share Code</p>
          <div class="share-code">${gearList.shareCode}</div>
        </div>
        
        <div class="share-url">
          <input type="text" value="${shareUrl}" readonly id="shareUrlInput">
          <button onclick="copyShareUrl()">Copy Link</button>
        </div>
        
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code">
          <p>Scan to view list</p>
        </div>
        
        <div class="list-stats">
          <div class="stat">
            <span class="stat-value">${stats.itemCount}</span>
            <span class="stat-label">Items</span>
          </div>
          <div class="stat">
            <span class="stat-value">${stats.totalWeight}kg</span>
            <span class="stat-label">Total Weight</span>
          </div>
          <div class="stat">
            <span class="stat-value">$${stats.totalValue}</span>
            <span class="stat-label">Total Value</span>
          </div>
        </div>
        
        <div class="share-actions">
          <button onclick="shareableGearLists.exportAsJSON(${JSON.stringify(gearList).replace(/"/g, '&quot;')})">
            Export JSON
          </button>
          <button onclick="shareableGearLists.exportAsPDF(${JSON.stringify(gearList).replace(/"/g, '&quot;')})">
            Export PDF
          </button>
          <button onclick="closeShareModal()">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  cancel() {
    this.selectedItems.clear();
    this.render();
  }
}

// Helper functions
window.copyShareUrl = function() {
  const input = document.getElementById('shareUrlInput');
  input.select();
  document.execCommand('copy');
  alert('Share link copied to clipboard!');
};

window.closeShareModal = function() {
  const modal = document.querySelector('.share-modal');
  if (modal) {
    modal.remove();
  }
};

// Export for use
window.shareableGearLists = shareableGearLists;
window.GearListCreator = GearListCreator;

// Make gearListCreator instance accessible
window.gearListCreator = null;