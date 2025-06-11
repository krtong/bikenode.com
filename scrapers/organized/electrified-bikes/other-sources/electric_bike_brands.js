// Electric Bike Categories and Brands
// Focus on e-bikes that don't fit traditional bicycle or motorcycle categories

const electricBikeCategories = {
  // Legal E-Bike Classes (typically allowed on bike paths/trails with restrictions)
  legalEBikes: {
    class1: {
      description: "Pedal-assist only, max 20mph, max 750W",
      examples: ["Trek e-bikes", "Specialized Turbo", "Giant E+"]
    },
    class2: {
      description: "Throttle + pedal-assist, max 20mph, max 750W", 
      examples: ["Rad Power Bikes", "Aventon", "Lectric"]
    },
    class3: {
      description: "Pedal-assist only, max 28mph, max 750W",
      examples: ["Stromer", "Bulls", "Riese & Müller"]
    }
  },

  // Off-Road/Non-Legal E-Bikes (the "fourth category" - too powerful for bike paths, not street legal as motorcycles)
  offRoadElectrics: {
    description: "Electric bikes that exceed legal e-bike limits but aren't registered motorcycles",
    characteristics: [
      "No pedals or non-functional pedals",
      "Power exceeding 750W (often 1500W-8000W)",
      "Speeds exceeding 28mph",
      "No turn signals/license plate mount",
      "Not DOT approved",
      "Often marketed as 'off-road only'"
    ],
    brands: [
      { name: "Sur-Ron", models: ["Light Bee", "Storm Bee"], power: "up to 6000W" },
      { name: "Talaria", models: ["Sting", "XXX"], power: "up to 8000W" },
      { name: "Segway", models: ["X160", "X260"], power: "3000W-5000W" },
      { name: "Stealth", models: ["B-52", "H-52", "F-37"], power: "3000W-5200W" },
      { name: "Monday Motorbikes", models: ["Presidio", "Gateway"], power: "1000W-2000W" },
      { name: "Onyx", models: ["RCR", "CTY2"], power: "3000W-5400W" },
      { name: "Huck Cycles", models: ["Stinger", "Rebel"], power: "3000W+" },
      { name: "Biktrix", models: ["Juggernaut Ultra Beast"], power: "2000W-3000W" },
      { name: "Luna Cycle", models: ["Sur-Ron", "X-1 Enduro"], power: "2000W-6000W" },
      { name: "CAB Motorworks", models: ["Recon", "Eagle"], power: "3000W+" },
      { name: "Delfast", models: ["Top 3.0"], power: "3000W-5000W" },
      { name: "Grizzly", models: ["52V models"], power: "1000W-3000W" }
    ]
  },

  // High-Power E-MTBs (technically e-bikes but pushing limits)
  highPowerEMTBs: {
    description: "E-MTBs with powerful motors that blur the line",
    characteristics: [
      "Have functional pedals",
      "Motor cutoff at legal speeds when on road",
      "Often have 'off-road mode' that removes restrictions",
      "750W-1000W+ motors"
    ],
    brands: [
      { name: "Haibike", models: ["XDURO", "SDURO"], notes: "Some models exceed class limits" },
      { name: "Bulls", models: ["E-Core EVO", "Sonic EVO"], notes: "High torque motors" },
      { name: "Frey", models: ["EX", "AM1000"], notes: "Bafang Ultra motors up to 1000W" }
    ]
  },

  // E-Mopeds (styled like mopeds but sold as e-bikes)
  eMopeds: {
    description: "Electric bikes styled like mopeds, often skirting regulations",
    characteristics: [
      "Moped/motorcycle styling",
      "Often have pedals to qualify as e-bikes",
      "Typically 750W-3000W",
      "Popular in urban areas"
    ],
    brands: [
      { name: "Super73", models: ["S2", "RX", "ZX"], power: "750W-2000W" },
      { name: "Ariel Rider", models: ["Grizzly", "X-Class"], power: "750W-3500W" },
      { name: "Juiced Bikes", models: ["Scorpion", "HyperScorpion"], power: "750W-1000W" },
      { name: "RadRunner", models: ["Plus"], power: "750W" },
      { name: "Sondors", models: ["Madmods"], power: "750W-1000W" },
      { name: "Michael Blast", models: ["Outsider", "Villain"], power: "500W-3000W" },
      { name: "Vintage Electric", models: ["Tracker", "Scrambler"], power: "750W-3000W" }
    ]
  },

  // Chinese Off-Road Electrics
  chineseOffRoad: {
    description: "Chinese manufacturers making Sur-Ron style bikes",
    brands: [
      { name: "Surron (Sur-Ron)", country: "China", notes: "Original off-road electric" },
      { name: "Talaria", country: "China", notes: "Sur-Ron competitor" },
      { name: "Ristretto", country: "China", models: ["512", "303"] },
      { name: "Eride Pro", country: "China", models: ["SR"] },
      { name: "Czem", country: "China", models: ["Tiger"] },
      { name: "Torp", country: "China", models: ["TC-Max"] },
      { name: "Bao Diao", country: "China", notes: "Various models" },
      { name: "E Ride", country: "China", notes: "Budget off-road electrics" }
    ]
  }
};

// Helper functions
function getBrandsByCategory(category) {
  if (electricBikeCategories[category] && electricBikeCategories[category].brands) {
    return electricBikeCategories[category].brands;
  }
  return [];
}

function getAllOffRoadBrands() {
  const brands = [];
  if (electricBikeCategories.offRoadElectrics) {
    brands.push(...electricBikeCategories.offRoadElectrics.brands);
  }
  if (electricBikeCategories.chineseOffRoad) {
    brands.push(...electricBikeCategories.chineseOffRoad.brands);
  }
  return brands;
}

function getAllNonLegalEBikes() {
  const brands = [];
  brands.push(...getAllOffRoadBrands());
  if (electricBikeCategories.eMopeds) {
    brands.push(...electricBikeCategories.eMopeds.brands);
  }
  return brands;
}

module.exports = {
  electricBikeCategories,
  getBrandsByCategory,
  getAllOffRoadBrands,
  getAllNonLegalEBikes
};