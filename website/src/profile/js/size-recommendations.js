// Size Recommendation System
// This module provides personalized gear size recommendations based on user measurements

const sizeRecommendations = {
  // Helmet sizing based on head circumference
  helmet: {
    measurementKey: 'headCircumference',
    brands: {
      shoei: {
        name: 'Shoei',
        sizes: {
          XS: { range: [53, 54], label: 'XS (53-54cm)' },
          S: { range: [55, 56], label: 'S (55-56cm)' },
          M: { range: [57, 58], label: 'M (57-58cm)' },
          L: { range: [59, 60], label: 'L (59-60cm)' },
          XL: { range: [61, 62], label: 'XL (61-62cm)' },
          XXL: { range: [63, 64], label: 'XXL (63-64cm)' }
        },
        notes: 'Shoei helmets tend to fit rounder head shapes better'
      },
      arai: {
        name: 'Arai',
        sizes: {
          XS: { range: [53, 54], label: 'XS (53-54cm)' },
          S: { range: [55, 56], label: 'S (55-56cm)' },
          M: { range: [57, 58], label: 'M (57-58cm)' },
          L: { range: [59, 60], label: 'L (59-60cm)' },
          XL: { range: [61, 62], label: 'XL (61-62cm)' },
          XXL: { range: [63, 64], label: 'XXL (63-64cm)' }
        },
        notes: 'Arai helmets tend to fit oval head shapes better'
      },
      agv: {
        name: 'AGV',
        sizes: {
          XS: { range: [53, 54], label: 'XS' },
          S: { range: [55, 56], label: 'S' },
          MS: { range: [57, 57], label: 'M/S' },
          ML: { range: [58, 58], label: 'M/L' },
          L: { range: [59, 60], label: 'L' },
          XL: { range: [61, 62], label: 'XL' },
          XXL: { range: [63, 64], label: 'XXL' }
        },
        notes: 'AGV offers intermediate sizes for better fit'
      }
    }
  },
  
  // Jacket sizing based on chest measurement
  jacket: {
    measurementKeys: ['chest', 'waist', 'height'],
    brands: {
      dainese: {
        name: 'Dainese',
        sizes: {
          46: { chest: [86, 90], waist: [74, 78], height: [165, 170], label: '46 (XS)' },
          48: { chest: [90, 94], waist: [78, 82], height: [168, 173], label: '48 (S)' },
          50: { chest: [94, 98], waist: [82, 86], height: [171, 176], label: '50 (M)' },
          52: { chest: [98, 102], waist: [86, 90], height: [174, 179], label: '52 (L)' },
          54: { chest: [102, 106], waist: [90, 94], height: [177, 182], label: '54 (XL)' },
          56: { chest: [106, 110], waist: [94, 98], height: [180, 185], label: '56 (XXL)' }
        },
        notes: 'European sizing, tends to run slim'
      },
      alpinestars: {
        name: 'Alpinestars',
        sizes: {
          46: { chest: [87, 91], waist: [75, 79], label: '46' },
          48: { chest: [91, 95], waist: [79, 83], label: '48' },
          50: { chest: [95, 99], waist: [83, 87], label: '50' },
          52: { chest: [99, 103], waist: [87, 91], label: '52' },
          54: { chest: [103, 107], waist: [91, 95], label: '54' },
          56: { chest: [107, 111], waist: [95, 99], label: '56' }
        },
        notes: 'Tech-Air compatible models may fit differently'
      },
      revit: {
        name: "REV'IT!",
        sizes: {
          S: { chest: [88, 92], waist: [76, 80], label: 'S' },
          M: { chest: [92, 96], waist: [80, 84], label: 'M' },
          L: { chest: [96, 100], waist: [84, 88], label: 'L' },
          XL: { chest: [100, 104], waist: [88, 92], label: 'XL' },
          XXL: { chest: [104, 108], waist: [92, 96], label: 'XXL' },
          XXXL: { chest: [108, 112], waist: [96, 100], label: 'XXXL' }
        },
        notes: 'Dutch brand, typically longer in torso'
      }
    }
  },
  
  // Glove sizing based on hand circumference
  gloves: {
    measurementKey: 'handCircumference',
    brands: {
      generic: {
        name: 'Standard',
        sizes: {
          XS: { range: [17, 18], label: 'XS (6.5"-7")' },
          S: { range: [19, 20], label: 'S (7.5"-8")' },
          M: { range: [21, 22], label: 'M (8.5"-9")' },
          L: { range: [23, 24], label: 'L (9.5"-10")' },
          XL: { range: [25, 26], label: 'XL (10.5"-11")' },
          XXL: { range: [27, 28], label: 'XXL (11.5"-12")' }
        },
        notes: 'Measure around knuckles for best fit'
      }
    }
  },
  
  // Pants sizing based on waist and inseam
  pants: {
    measurementKeys: ['waist', 'inseam', 'hips'],
    brands: {
      dainese: {
        name: 'Dainese',
        sizes: {
          44: { waist: [72, 76], inseam: [76, 78], label: '44' },
          46: { waist: [76, 80], inseam: [78, 80], label: '46' },
          48: { waist: [80, 84], inseam: [80, 82], label: '48' },
          50: { waist: [84, 88], inseam: [82, 84], label: '50' },
          52: { waist: [88, 92], inseam: [84, 86], label: '52' },
          54: { waist: [92, 96], inseam: [86, 88], label: '54' }
        },
        notes: 'European sizing, knee armor position is adjustable'
      },
      alpinestars: {
        name: 'Alpinestars',
        sizes: {
          28: { waist: [71, 74], label: '28' },
          30: { waist: [76, 79], label: '30' },
          32: { waist: [81, 84], label: '32' },
          34: { waist: [86, 89], label: '34' },
          36: { waist: [91, 94], label: '36' },
          38: { waist: [97, 99], label: '38' }
        },
        notes: 'US sizing available in most models'
      }
    }
  },
  
  // Boot sizing based on shoe size
  boots: {
    measurementKey: 'shoeSize',
    brands: {
      sidi: {
        name: 'Sidi',
        sizes: {
          39: { us: [6, 6.5], label: '39 (US 6-6.5)' },
          40: { us: [7, 7.5], label: '40 (US 7-7.5)' },
          41: { us: [8, 8], label: '41 (US 8)' },
          42: { us: [8.5, 9], label: '42 (US 8.5-9)' },
          43: { us: [9.5, 10], label: '43 (US 9.5-10)' },
          44: { us: [10.5, 11], label: '44 (US 10.5-11)' },
          45: { us: [11.5, 12], label: '45 (US 11.5-12)' },
          46: { us: [12.5, 13], label: '46 (US 12.5-13)' }
        },
        notes: 'Italian sizing, tends to run narrow'
      },
      alpinestars: {
        name: 'Alpinestars',
        sizes: {
          7: { eu: 40, label: 'US 7 (EU 40)' },
          8: { eu: 41, label: 'US 8 (EU 41)' },
          9: { eu: 42.5, label: 'US 9 (EU 42.5)' },
          10: { eu: 44, label: 'US 10 (EU 44)' },
          11: { eu: 45, label: 'US 11 (EU 45)' },
          12: { eu: 46.5, label: 'US 12 (EU 46.5)' },
          13: { eu: 48, label: 'US 13 (EU 48)' }
        },
        notes: 'US sizing, generally true to size'
      }
    }
  }
};

// Get size recommendations for a user
function getSizeRecommendations(userMeasurements, gearType) {
  const recommendations = [];
  const gearConfig = sizeRecommendations[gearType];
  
  if (!gearConfig) {
    return { error: 'Unknown gear type' };
  }
  
  // Handle single measurement
  if (gearConfig.measurementKey) {
    const measurement = userMeasurements[gearConfig.measurementKey];
    if (!measurement) {
      return { error: `Missing measurement: ${gearConfig.measurementKey}` };
    }
    
    Object.entries(gearConfig.brands).forEach(([brandKey, brand]) => {
      const recommendedSize = findRecommendedSize(measurement, brand.sizes);
      if (recommendedSize) {
        recommendations.push({
          brand: brand.name,
          size: recommendedSize.label,
          confidence: recommendedSize.confidence,
          notes: brand.notes
        });
      }
    });
  }
  
  // Handle multiple measurements
  if (gearConfig.measurementKeys) {
    Object.entries(gearConfig.brands).forEach(([brandKey, brand]) => {
      const sizeScores = {};
      
      Object.entries(brand.sizes).forEach(([sizeKey, sizeData]) => {
        let score = 0;
        let measuredCount = 0;
        
        gearConfig.measurementKeys.forEach(measurementKey => {
          const userValue = userMeasurements[measurementKey];
          const sizeRange = sizeData[measurementKey];
          
          if (userValue && sizeRange) {
            measuredCount++;
            if (userValue >= sizeRange[0] && userValue <= sizeRange[1]) {
              score += 1;
            } else {
              // Partial score for close matches
              const distance = Math.min(
                Math.abs(userValue - sizeRange[0]),
                Math.abs(userValue - sizeRange[1])
              );
              score += Math.max(0, 1 - (distance / 10));
            }
          }
        });
        
        if (measuredCount > 0) {
          sizeScores[sizeKey] = {
            score: score / measuredCount,
            label: sizeData.label
          };
        }
      });
      
      // Find best matching size
      const bestSize = Object.entries(sizeScores)
        .sort((a, b) => b[1].score - a[1].score)[0];
      
      if (bestSize && bestSize[1].score > 0.5) {
        recommendations.push({
          brand: brand.name,
          size: bestSize[1].label,
          confidence: Math.round(bestSize[1].score * 100),
          notes: brand.notes
        });
      }
    });
  }
  
  return {
    gearType,
    recommendations: recommendations.sort((a, b) => b.confidence - a.confidence)
  };
}

// Find recommended size for single measurement
function findRecommendedSize(measurement, sizes) {
  for (const [sizeKey, sizeData] of Object.entries(sizes)) {
    if (sizeData.range && measurement >= sizeData.range[0] && measurement <= sizeData.range[1]) {
      return {
        label: sizeData.label,
        confidence: 100
      };
    }
    
    if (sizeData.us && measurement >= sizeData.us[0] && measurement <= sizeData.us[1]) {
      return {
        label: sizeData.label,
        confidence: 100
      };
    }
  }
  
  // Find closest match
  let closestSize = null;
  let minDistance = Infinity;
  
  for (const [sizeKey, sizeData] of Object.entries(sizes)) {
    const range = sizeData.range || sizeData.us;
    if (range) {
      const distance = Math.min(
        Math.abs(measurement - range[0]),
        Math.abs(measurement - range[1])
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSize = {
          label: sizeData.label,
          confidence: Math.max(50, 100 - (distance * 10))
        };
      }
    }
  }
  
  return closestSize;
}

// Convert between measurement units
const measurementConversions = {
  cmToInches: (cm) => cm * 0.393701,
  inchesToCm: (inches) => inches * 2.54,
  shoeSizeUSToEU: (us) => {
    const conversions = {
      6: 39, 6.5: 39.5, 7: 40, 7.5: 40.5, 8: 41, 8.5: 42,
      9: 42.5, 9.5: 43, 10: 44, 10.5: 44.5, 11: 45, 11.5: 46,
      12: 46.5, 12.5: 47, 13: 48
    };
    return conversions[us] || null;
  }
};

// Generate size comparison chart
function generateSizeChart(gearType, brands = []) {
  const gearConfig = sizeRecommendations[gearType];
  if (!gearConfig) return null;
  
  const chart = {
    gearType,
    measurementKeys: gearConfig.measurementKey ? [gearConfig.measurementKey] : gearConfig.measurementKeys,
    brands: {}
  };
  
  const selectedBrands = brands.length > 0 ? brands : Object.keys(gearConfig.brands);
  
  selectedBrands.forEach(brandKey => {
    if (gearConfig.brands[brandKey]) {
      chart.brands[brandKey] = gearConfig.brands[brandKey];
    }
  });
  
  return chart;
}

// Export for use in profile
window.gearSizeRecommendations = {
  getSizeRecommendations,
  generateSizeChart,
  measurementConversions,
  sizeDatabase: sizeRecommendations
};