// Gray Area Electric Bikes Database
// Fourth category e-bikes: Too powerful for bike paths, not street legal as motorcycles
// These typically have >750W motors, go >28mph, and lack DOT/street legal equipment
// Includes: off-road bikes, high-power urban commuters, delivery e-bikes, etc.

const offRoadElectricBrands = {
  // SUR-RON
  "Sur-Ron": {
    country: "China",
    website: "https://sur-ronusa.com",
    founded: 2014,
    headquarters: "Jinhua, Zhejiang, China",
    models: [
      {
        model: "Light Bee X",
        variants: [
          { 
            name: "Light Bee X", 
            motor: "6000W peak / 3000W nominal", 
            battery: "60V 32Ah Samsung/Panasonic cells", 
            topSpeed: "47mph (75km/h)", 
            weight: "118lbs (53.5kg)",
            range: "40-60 miles",
            price: "$4,500-5,200",
            availability: "In stock",
            suspension: "DNM inverted front fork, DNM rear shock",
            brakes: "Hydraulic disc front/rear",
            tires: "19\" front / 18\" rear knobby",
            chargingTime: "3-4 hours",
            torque: "250Nm",
            controller: "FOC sine wave"
          },
          { 
            name: "Light Bee S", 
            motor: "5000W peak / 2500W nominal", 
            battery: "60V 32Ah", 
            topSpeed: "45mph (72km/h)", 
            weight: "110lbs (50kg)",
            range: "35-50 miles",
            price: "$4,200-4,800",
            availability: "Limited stock",
            suspension: "Conventional front fork, rear shock",
            brakes: "Hydraulic disc",
            notes: "Entry-level model"
          }
        ]
      },
      {
        model: "Storm Bee",
        variants: [
          { 
            name: "Storm Bee", 
            motor: "22500W peak / 11000W nominal", 
            battery: "96V 55Ah", 
            topSpeed: "68mph (110km/h)", 
            weight: "253lbs (115kg)",
            range: "60-80 miles",
            price: "$8,500-9,500",
            availability: "Pre-order",
            suspension: "WP XACT front fork, WP XACT rear shock",
            brakes: "J.Juan 4-piston calipers",
            tires: "21\" front / 18\" rear",
            chargingTime: "6-8 hours",
            torque: "520Nm",
            notes: "Professional/competition model"
          }
        ]
      },
      {
        model: "Ultra Bee",
        variants: [
          { 
            name: "Ultra Bee", 
            motor: "12500W peak / 6000W nominal", 
            battery: "74V 55Ah", 
            topSpeed: "55mph (88km/h)", 
            weight: "187lbs (85kg)",
            range: "50-70 miles",
            price: "$6,500-7,500",
            availability: "Coming 2025",
            suspension: "WP components",
            brakes: "Brembo 4-piston",
            notes: "Mid-range performance model"
          }
        ]
      }
    ]
  },

  // TALARIA
  "Talaria": {
    country: "China", 
    website: "https://talaria.bike",
    founded: 2019,
    headquarters: "Hangzhou, China",
    models: [
      {
        model: "Sting",
        variants: [
          { 
            name: "Sting MX3", 
            motor: "6000W peak / 3000W continuous", 
            battery: "60V 38Ah LG/Samsung cells", 
            topSpeed: "45mph (72km/h)", 
            weight: "143lbs (65kg)",
            range: "50-70 miles",
            price: "$4,800-5,400",
            availability: "In stock",
            suspension: "USD front fork 43mm, rear mono shock",
            brakes: "4-piston hydraulic disc F/R",
            tires: "21\" front / 18\" rear dirt",
            chargingTime: "4-5 hours",
            torque: "300Nm",
            groundClearance: "13.4 inches"
          },
          { 
            name: "Sting R MX4", 
            motor: "8000W peak / 4000W continuous", 
            battery: "72V 38Ah", 
            topSpeed: "50mph (80km/h)", 
            weight: "154lbs (70kg)",
            range: "45-65 miles", 
            price: "$5,500-6,200",
            availability: "Limited stock",
            suspension: "KYB USD fork, KYB rear shock",
            brakes: "Brembo 4-piston",
            notes: "Racing version with upgraded components"
          }
        ]
      },
      {
        model: "XXX",
        variants: [
          { 
            name: "Dragon Light", 
            motor: "16000W peak / 8000W continuous", 
            battery: "96V 42Ah", 
            topSpeed: "75mph (120km/h)", 
            weight: "176lbs (80kg)",
            range: "40-60 miles",
            price: "$7,500-8,500",
            availability: "Pre-order",
            suspension: "WP XACT components",
            brakes: "J.Juan 4-piston radial",
            tires: "21\" front / 18\" rear race",
            notes: "High-performance model"
          },
          { 
            name: "Dragon", 
            motor: "28000W peak / 14000W continuous", 
            battery: "96V 55Ah", 
            topSpeed: "80mph (130km/h)", 
            weight: "220lbs (100kg)",
            range: "50-70 miles",
            price: "$12,000-15,000",
            availability: "Concept/limited production",
            suspension: "Full WP XACT setup",
            brakes: "Brembo Stylema calipers",
            notes: "Flagship extreme performance model"
          }
        ]
      }
    ]
  },

  // SEGWAY
  "Segway": {
    country: "China",
    website: "https://www.segway.com",
    models: [
      {
        model: "Dirt eBike",
        variants: [
          { name: "X160", motor: "3000W", battery: "48V 10.5Ah", topSpeed: "31mph", weight: "105lbs" },
          { name: "X260", motor: "5000W", battery: "60V 18.5Ah", topSpeed: "46mph", weight: "121lbs" }
        ]
      }
    ]
  },

  // STEALTH ELECTRIC BIKES
  "Stealth": {
    country: "Australia",
    website: "https://www.stealthelectricbikes.com",
    models: [
      {
        model: "Fighter",
        variants: [
          { name: "F-37", motor: "3700W", battery: "72V 21Ah", topSpeed: "37mph", weight: "116lbs" }
        ]
      },
      {
        model: "Bomber",
        variants: [
          { name: "B-52", motor: "5200W", battery: "72V 38.5Ah", topSpeed: "50mph", weight: "116lbs" }
        ]
      },
      {
        model: "Hurricane",
        variants: [
          { name: "H-52", motor: "5200W", battery: "72V 29.5Ah", topSpeed: "50mph", weight: "120lbs" }
        ]
      }
    ]
  },

  // ONYX MOTORBIKES
  "Onyx": {
    country: "USA",
    website: "https://onyxmotorbikes.com",
    models: [
      {
        model: "RCR",
        variants: [
          { name: "RCR 72V", motor: "5400W", battery: "72V 41Ah", topSpeed: "60mph", weight: "150lbs" }
        ]
      },
      {
        model: "CTY2",
        variants: [
          { name: "CTY2", motor: "3000W", battery: "60V 25Ah", topSpeed: "30mph", weight: "140lbs" }
        ]
      },
      {
        model: "ONYX LZR",
        variants: [
          { name: "LZR", motor: "2000W", battery: "48V 17.5Ah", topSpeed: "28mph", weight: "70lbs" }
        ]
      }
    ]
  },

  // MONDAY MOTORBIKES
  "Monday": {
    country: "USA",
    website: "https://mondaymotorbikes.com",
    models: [
      {
        model: "Gateway",
        variants: [
          { name: "Gateway 750", motor: "750W", battery: "48V 15Ah", topSpeed: "28mph", weight: "85lbs" }
        ]
      },
      {
        model: "Presidio",
        variants: [
          { name: "Presidio 750", motor: "750W", battery: "48V 17.5Ah", topSpeed: "28mph", weight: "95lbs" }
        ]
      },
      {
        model: "Anza",
        variants: [
          { name: "Anza 750", motor: "750W", battery: "48V 15Ah", topSpeed: "20mph", weight: "105lbs" }
        ]
      }
    ]
  },

  // LUNA CYCLE
  "Luna Cycle": {
    country: "USA",
    website: "https://lunacycle.com",
    founded: 2013,
    headquarters: "Chula Vista, California",
    models: [
      {
        model: "X-1 Enduro",
        variants: [
          { 
            name: "X-1 Enduro V2", 
            motor: "2000W Bafang Ultra", 
            battery: "60V 18Ah Samsung cells", 
            topSpeed: "40mph", 
            weight: "75lbs (34kg)",
            range: "25-40 miles",
            price: "$3,200-3,800",
            availability: "Made to order",
            suspension: "RockShox front, DNM rear",
            brakes: "Magura MT5 hydraulic",
            frame: "Custom chromoly steel",
            chargingTime: "4-6 hours",
            notes: "High-performance enduro build"
          }
        ]
      },
      {
        model: "Z-1",
        variants: [
          { 
            name: "Z-1", 
            motor: "1000W Bafang BBSHD", 
            battery: "52V 13Ah", 
            topSpeed: "30mph", 
            weight: "70lbs (32kg)",
            range: "20-35 miles",
            price: "$2,400-2,800",
            availability: "In stock",
            suspension: "Front fork only",
            brakes: "Hydraulic disc",
            notes: "Mid-drive commuter"
          }
        ]
      },
      {
        model: "Eclipse",
        variants: [
          { 
            name: "Eclipse", 
            motor: "3000W QS Motor hub", 
            battery: "72V 30Ah", 
            topSpeed: "40mph", 
            weight: "130lbs (59kg)",
            range: "30-50 miles",
            price: "$4,500-5,200",
            availability: "Custom build",
            suspension: "DNM USD fork, rear shock",
            brakes: "Magura MT7 4-piston",
            frame: "Steel hardtail",
            notes: "High-power hub drive build"
          }
        ]
      },
      {
        model: "Banana",
        variants: [
          {
            name: "Banana V3",
            motor: "1500W Bafang BBSHD",
            battery: "52V 14Ah",
            topSpeed: "35mph",
            weight: "65lbs (29kg)",
            range: "25-40 miles", 
            price: "$2,800-3,200",
            availability: "Limited production",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Custom yellow powder coat",
            notes: "Signature Luna model"
          }
        ]
      }
    ]
  },

  // DELFAST
  "Delfast": {
    country: "Ukraine",
    website: "https://delfastbikes.com",
    models: [
      {
        model: "Top",
        variants: [
          { name: "Top 3.0", motor: "3000W", battery: "72V 48Ah", topSpeed: "50mph", weight: "154lbs", range: "200miles" },
          { name: "Top 3.0i", motor: "5000W", battery: "72V 48Ah", topSpeed: "50mph", weight: "165lbs" }
        ]
      },
      {
        model: "Prime",
        variants: [
          { name: "Prime 2.0", motor: "750W", battery: "48V 20Ah", topSpeed: "25mph", weight: "79lbs" }
        ]
      }
    ]
  },

  // CAB MOTORWORKS
  "CAB Motorworks": {
    country: "USA",
    website: "https://www.cabmotorworks.com",
    models: [
      {
        model: "Recon",
        variants: [
          { name: "Recon", motor: "3000W", battery: "52V 20Ah", topSpeed: "35mph", weight: "84lbs" },
          { name: "Recon Power", motor: "5000W", battery: "72V 29Ah", topSpeed: "45mph", weight: "97lbs" }
        ]
      },
      {
        model: "Eagle",
        variants: [
          { name: "Eagle", motor: "1000W", battery: "48V 14Ah", topSpeed: "28mph", weight: "68lbs" }
        ]
      }
    ]
  },

  // HUCK CYCLES
  "Huck Cycles": {
    country: "USA",
    website: "https://huckcycles.com",
    models: [
      {
        model: "Stinger",
        variants: [
          { name: "Stinger", motor: "3000W", battery: "72V 25Ah", topSpeed: "45mph", weight: "125lbs" }
        ]
      },
      {
        model: "Rebel",
        variants: [
          { name: "Rebel", motor: "3000W", battery: "60V 30Ah", topSpeed: "40mph", weight: "110lbs" }
        ]
      },
      {
        model: "Assault",
        variants: [
          { name: "Assault", motor: "5000W", battery: "72V 35Ah", topSpeed: "55mph", weight: "140lbs" }
        ]
      }
    ]
  },

  // CAKE
  "Cake": {
    country: "Sweden",
    website: "https://ridecake.com",
    models: [
      {
        model: "Kalk",
        variants: [
          { name: "Kalk OR", motor: "11kW", battery: "72V 50Ah", topSpeed: "56mph", weight: "176lbs" },
          { name: "Kalk&", motor: "11kW", battery: "72V 50Ah", topSpeed: "56mph", weight: "174lbs" },
          { name: "Kalk INK", motor: "11kW", battery: "72V 50Ah", topSpeed: "56mph", weight: "172lbs" }
        ]
      },
      {
        model: "Osa",
        variants: [
          { name: "Osa+", motor: "10kW", battery: "72V 50Ah", topSpeed: "39mph", weight: "145lbs" },
          { name: "Osa Lite", motor: "5kW", battery: "72V 32Ah", topSpeed: "28mph", weight: "121lbs" }
        ]
      },
      {
        model: "Makka",
        variants: [
          { name: "Makka", motor: "5kW", battery: "51V 32Ah", topSpeed: "28mph", weight: "132lbs" }
        ]
      }
    ]
  },

  // ELECTRIC MOTION
  "Electric Motion": {
    country: "France",
    website: "https://www.electricmotion.fr",
    models: [
      {
        model: "Escape",
        variants: [
          { name: "Escape R", motor: "6000W", battery: "60V 41Ah", topSpeed: "46mph", weight: "167lbs" }
        ]
      },
      {
        model: "Epure",
        variants: [
          { name: "Epure Sport", motor: "11kW", battery: "60V 50Ah", topSpeed: "45mph", weight: "154lbs" },
          { name: "Epure Race", motor: "12.5kW", battery: "60V 50Ah", topSpeed: "50mph", weight: "150lbs" }
        ]
      }
    ]
  },

  // BIKTRIX
  "Biktrix": {
    country: "Canada",
    website: "https://www.biktrix.com",
    models: [
      {
        model: "Juggernaut",
        variants: [
          { name: "Juggernaut Ultra Beast", motor: "2000W", battery: "52V 30Ah", topSpeed: "35mph", weight: "95lbs" },
          { name: "Juggernaut Ultra FS Pro", motor: "1000W", battery: "48V 17Ah", topSpeed: "28mph", weight: "75lbs" }
        ]
      },
      {
        model: "Swift",
        variants: [
          { name: "Swift Step-Over", motor: "750W", battery: "48V 14Ah", topSpeed: "25mph", weight: "60lbs" }
        ]
      }
    ]
  },

  // GRIZZLY
  "Grizzly": {
    country: "USA",
    website: "https://grizzly.bike",
    models: [
      {
        model: "52V",
        variants: [
          { name: "Grizzly 52V", motor: "1000W", battery: "52V 20Ah", topSpeed: "35mph", weight: "75lbs" },
          { name: "Grizzly Dual Motor", motor: "2000W", battery: "52V 20Ah", topSpeed: "40mph", weight: "85lbs" }
        ]
      }
    ]
  },

  // CHINESE BRANDS
  "E Ride Pro": {
    country: "China",
    models: [
      {
        model: "SR",
        variants: [
          { name: "E Ride Pro SR", motor: "5000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "120lbs" }
        ]
      }
    ]
  },

  "Ristretto": {
    country: "China",
    models: [
      {
        model: "Electric Bikes",
        variants: [
          { name: "512 Sport", motor: "5000W", battery: "60V 35Ah", topSpeed: "50mph", weight: "132lbs" },
          { name: "303 FS", motor: "3000W", battery: "60V 20Ah", topSpeed: "35mph", weight: "110lbs" }
        ]
      }
    ]
  },

  "CZEM": {
    country: "China",
    models: [
      {
        model: "Tiger",
        variants: [
          { name: "Tiger 8", motor: "8000W", battery: "72V 35Ah", topSpeed: "55mph", weight: "143lbs" }
        ]
      }
    ]
  },

  "Torp": {
    country: "China",
    models: [
      {
        model: "TC",
        variants: [
          { name: "TC-Max", motor: "8000W", battery: "72V 40Ah", topSpeed: "60mph", weight: "150lbs" },
          { name: "TC-2000", motor: "2000W", battery: "60V 20Ah", topSpeed: "35mph", weight: "110lbs" }
        ]
      }
    ]
  },

  "Bao Diao": {
    country: "China",
    models: [
      {
        model: "BD",
        variants: [
          { name: "BD-5000", motor: "5000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "125lbs" }
        ]
      }
    ]
  },

  "Kollter": {
    country: "China",
    website: "https://kollterusa.com",
    models: [
      {
        model: "ES1",
        variants: [
          { name: "ES1-S", motor: "3000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "165lbs" },
          { name: "ES1-R", motor: "5000W", battery: "72V 30Ah", topSpeed: "50mph", weight: "170lbs" }
        ]
      }
    ]
  },

  "Suron Clone Brands": {
    country: "China",
    notes: "Various manufacturers producing Sur-Ron clones",
    models: [
      {
        model: "Generic Clones",
        variants: [
          { name: "Kanuni Saber", motor: "5000W", battery: "60V 32Ah", topSpeed: "45mph", weight: "120lbs" },
          { name: "Ebroh Bravo GLE", motor: "5000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "115lbs" },
          { name: "Tinbot TB-ESUM", motor: "5000W", battery: "60V 32Ah", topSpeed: "45mph", weight: "118lbs" }
        ]
      }
    ]
  },

  // MORE USA BRANDS
  "Rambo": {
    country: "USA",
    website: "https://www.rambobikes.com",
    models: [
      {
        model: "Rambo Bikes",
        variants: [
          { name: "Ryder", motor: "750W", battery: "48V 14Ah", topSpeed: "28mph", weight: "65lbs" },
          { name: "Pursuit", motor: "1000W", battery: "48V 21Ah", topSpeed: "28mph", weight: "75lbs" },
          { name: "Rampage", motor: "1000W", battery: "48V 21Ah", topSpeed: "28mph", weight: "84lbs" }
        ]
      }
    ]
  },

  "QuietKat": {
    country: "USA",
    website: "https://quietkat.com",
    models: [
      {
        model: "Apex",
        variants: [
          { name: "Apex Sport", motor: "1000W", battery: "48V 14Ah", topSpeed: "28mph", weight: "68lbs" },
          { name: "Apex Pro", motor: "1000W", battery: "48V 21Ah", topSpeed: "28mph", weight: "75lbs" }
        ]
      },
      {
        model: "Jeep",
        variants: [
          { name: "Jeep E-Bike", motor: "750W", battery: "48V 14Ah", topSpeed: "28mph", weight: "75lbs" }
        ]
      }
    ]
  },

  "Wicked Thumb": {
    country: "USA",
    models: [
      {
        model: "ET Bike",
        variants: [
          { name: "ET.R", motor: "5000W", battery: "72V 35Ah", topSpeed: "55mph", weight: "140lbs" },
          { name: "ET.S", motor: "3000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "125lbs" }
        ]
      }
    ]
  },

  "HPC (Hi Power Cycles)": {
    country: "USA",
    website: "https://www.hi-powercycles.com",
    models: [
      {
        model: "Revolution",
        variants: [
          { name: "Revolution X", motor: "10000W", battery: "72V 30Ah", topSpeed: "65mph", weight: "120lbs" },
          { name: "Revolution M", motor: "6000W", battery: "72V 20Ah", topSpeed: "55mph", weight: "100lbs" }
        ]
      },
      {
        model: "Scout",
        variants: [
          { name: "Scout Pro", motor: "3000W", battery: "52V 28Ah", topSpeed: "40mph", weight: "80lbs" }
        ]
      }
    ]
  },

  "Neematic": {
    country: "France",
    models: [
      {
        model: "FR/1",
        variants: [
          { name: "FR/1 Enduro", motor: "21kW", battery: "72V 50Ah", topSpeed: "62mph", weight: "165lbs" },
          { name: "FR/1 Race", motor: "30kW", battery: "72V 50Ah", topSpeed: "75mph", weight: "161lbs" }
        ]
      }
    ]
  },

  "Ubco": {
    country: "New Zealand",
    website: "https://www.ubco.com",
    models: [
      {
        model: "2X2",
        variants: [
          { name: "2X2 Work Bike", motor: "1000W", battery: "48V 31Ah", topSpeed: "30mph", weight: "144lbs" },
          { name: "2X2 Adventure", motor: "1000W", battery: "48V 41Ah", topSpeed: "30mph", weight: "150lbs" }
        ]
      }
    ]
  },

  "Fly Free": {
    country: "USA",
    models: [
      {
        model: "Smart Bikes",
        variants: [
          { name: "Smart Classic", motor: "3000W", battery: "60V 30Ah", topSpeed: "40mph", weight: "95lbs" },
          { name: "Smart Extreme", motor: "5000W", battery: "72V 40Ah", topSpeed: "50mph", weight: "115lbs" }
        ]
      }
    ]
  },

  // URBAN/COMMUTER GRAY AREA E-BIKES
  "Vintage Electric": {
    country: "USA",
    website: "https://www.vintageelectricbikes.com",
    models: [
      {
        model: "Roadster",
        variants: [
          { name: "Roadster", motor: "750W", battery: "48V 15Ah", topSpeed: "36mph", weight: "85lbs", notes: "Race mode unlocks higher speeds" }
        ]
      },
      {
        model: "Tracker",
        variants: [
          { name: "Tracker Classic", motor: "750W", battery: "48V 15Ah", topSpeed: "36mph", weight: "90lbs" }
        ]
      },
      {
        model: "Scrambler",
        variants: [
          { name: "Scrambler", motor: "750W", battery: "48V 15Ah", topSpeed: "36mph", weight: "88lbs" }
        ]
      }
    ]
  },

  "Michael Blast": {
    country: "USA",
    website: "https://michaelblast.com",
    models: [
      {
        model: "Outsider",
        variants: [
          { name: "Outsider", motor: "3000W", battery: "48V 20Ah", topSpeed: "30mph", weight: "88lbs" }
        ]
      },
      {
        model: "Villain",
        variants: [
          { name: "Villain", motor: "3000W", battery: "48V 20Ah", topSpeed: "30mph", weight: "90lbs" }
        ]
      },
      {
        model: "Greaser",
        variants: [
          { name: "Greaser", motor: "500W-3000W", battery: "48V 15Ah", topSpeed: "28mph", weight: "70lbs" }
        ]
      }
    ]
  },

  "Coast Cycles": {
    country: "USA",
    models: [
      {
        model: "Buzzraw",
        variants: [
          { name: "Buzzraw X", motor: "1000W", battery: "48V 14Ah", topSpeed: "35mph", weight: "65lbs" },
          { name: "Buzzraw Pro", motor: "3000W", battery: "48V 21Ah", topSpeed: "45mph", weight: "75lbs" }
        ]
      }
    ]
  },

  "Lithium Cycles": {
    country: "USA",
    models: [
      {
        model: "Super 73 Style",
        variants: [
          { name: "Yamaha", motor: "1000W", battery: "48V 14Ah", topSpeed: "30mph", weight: "70lbs" },
          { name: "Kawasaki", motor: "1000W", battery: "48V 14Ah", topSpeed: "30mph", weight: "70lbs" }
        ]
      }
    ]
  },

  "ONYX Motorbikes": {
    country: "USA",
    website: "https://onyxmotorbikes.com",
    models: [
      {
        model: "ONYX RCR",
        variants: [
          { name: "RCR", motor: "5400W", battery: "72V 23Ah", topSpeed: "60mph", weight: "120lbs" },
          { name: "RCR 72V Extended Range", motor: "5400W", battery: "72V 41Ah", topSpeed: "60mph", weight: "150lbs" }
        ]
      },
      {
        model: "ONYX CTY2",
        variants: [
          { name: "CTY2", motor: "3000W", battery: "60V 22.5Ah", topSpeed: "30mph", weight: "140lbs" }
        ]
      }
    ]
  },

  // DELIVERY/CARGO GRAY AREA
  "Zoomo": {
    country: "Australia",
    website: "https://www.zoomo.com",
    models: [
      {
        model: "Sport",
        variants: [
          { name: "Sport", motor: "1000W", battery: "48V 17.5Ah", topSpeed: "28mph", weight: "85lbs", notes: "Delivery optimized" }
        ]
      },
      {
        model: "Zero",
        variants: [
          { name: "Zero", motor: "500W", battery: "48V 15Ah", topSpeed: "25mph", weight: "75lbs" }
        ]
      }
    ]
  },

  "Bond Mobility": {
    country: "Switzerland",
    models: [
      {
        model: "Bond",
        variants: [
          { name: "Bond", motor: "500W", battery: "48V 10Ah", topSpeed: "25mph", weight: "65lbs", notes: "Shared mobility focused" }
        ]
      }
    ]
  },

  // SPEED PEDELECS (TECHNICALLY LEGAL IN SOME AREAS BUT GRAY IN OTHERS)
  "Klever": {
    country: "Germany",
    website: "https://www.klever-mobility.com",
    models: [
      {
        model: "X-Speed",
        variants: [
          { name: "X-Speed", motor: "600W", battery: "48V 17Ah", topSpeed: "28mph", weight: "55lbs" }
        ]
      },
      {
        model: "X Commuter",
        variants: [
          { name: "X Commuter", motor: "1000W", battery: "48V 19Ah", topSpeed: "45kmh", weight: "60lbs" }
        ]
      }
    ]
  },

  // MORE CHINESE GRAY AREA BRANDS
  "Dayi Motor": {
    country: "China",
    models: [
      {
        model: "E-Dirt",
        variants: [
          { name: "DY-X7", motor: "5000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "115lbs" }
        ]
      }
    ]
  },

  "Kaabo": {
    country: "China",
    website: "https://www.kaabo.com",
    models: [
      {
        model: "Wolf",
        variants: [
          { name: "Wolf Warrior X", motor: "2400W", battery: "60V 21Ah", topSpeed: "40mph", weight: "101lbs", notes: "Scooter-bike hybrid" }
        ]
      }
    ]
  },

  "Nami": {
    country: "China",
    models: [
      {
        model: "Burn-E",
        variants: [
          { name: "Burn-E", motor: "5000W", battery: "72V 32Ah", topSpeed: "60mph", weight: "102lbs", notes: "Scooter-bike hybrid" }
        ]
      }
    ]
  },

  // MOPED-STYLE GRAY AREA
  "NIU": {
    country: "China",
    website: "https://www.niu.com",
    models: [
      {
        model: "NGT",
        variants: [
          { name: "NGT", motor: "3000W", battery: "60V 35Ah", topSpeed: "45mph", weight: "200lbs", notes: "Moped class" }
        ]
      },
      {
        model: "UQi",
        variants: [
          { name: "UQi GT Pro", motor: "1500W", battery: "48V 31Ah", topSpeed: "28mph", weight: "120lbs" }
        ]
      }
    ]
  },

  "Gogoro": {
    country: "Taiwan",
    website: "https://www.gogoro.com",
    models: [
      {
        model: "VIVA",
        variants: [
          { name: "VIVA Mix", motor: "3000W", battery: "Swappable", topSpeed: "30mph", weight: "176lbs" }
        ]
      }
    ]
  },

  "Maeving": {
    country: "UK",
    website: "https://maeving.com",
    models: [
      {
        model: "RM1",
        variants: [
          { name: "RM1", motor: "3000W", battery: "48V 45Ah", topSpeed: "45mph", weight: "124lbs" }
        ]
      }
    ]
  },

  "Peugeot": {
    country: "France",
    models: [
      {
        model: "e-Ludix",
        variants: [
          { name: "e-Ludix", motor: "2000W", battery: "48V 30Ah", topSpeed: "28mph", weight: "110lbs" }
        ]
      }
    ]
  },

  // MOTORCYCLE-STYLE EBIKES (NOT REGISTERED)
  "Black Tea": {
    country: "Germany",
    models: [
      {
        model: "Bonfire",
        variants: [
          { name: "Bonfire S", motor: "5000W", battery: "72V 32Ah", topSpeed: "31mph", weight: "220lbs" },
          { name: "Bonfire X", motor: "10000W", battery: "72V 50Ah", topSpeed: "55mph", weight: "240lbs" }
        ]
      }
    ]
  },

  "Metacycle": {
    country: "USA",
    models: [
      {
        model: "Metacycle",
        variants: [
          { name: "Metacycle", motor: "8000W", battery: "72V 20Ah", topSpeed: "75mph", weight: "200lbs", notes: "Commuter e-moto" }
        ]
      }
    ]
  },

  "Ryvid": {
    country: "USA",
    website: "https://ryvid.com",
    models: [
      {
        model: "Anthem",
        variants: [
          { name: "Anthem", motor: "7500W", battery: "72V 20Ah", topSpeed: "75mph", weight: "315lbs" }
        ]
      }
    ]
  },

  "RGNT": {
    country: "Sweden",
    website: "https://www.rgnt-motorcycles.com",
    models: [
      {
        model: "No.1",
        variants: [
          { name: "No.1 Classic", motor: "11kW", battery: "72V 30Ah", topSpeed: "75mph", weight: "287lbs" },
          { name: "No.1 Scrambler", motor: "11kW", battery: "72V 30Ah", topSpeed: "75mph", weight: "290lbs" }
        ]
      }
    ]
  },

  // EBIKE KIT MANUFACTURERS (GRAY AREA BUILDS)
  "ElectricBike.com": {
    country: "USA",
    website: "https://electricbike.com",
    models: [
      {
        model: "High Power Kits",
        variants: [
          { name: "5000W Hub Motor Kit", motor: "5000W", battery: "Custom", topSpeed: "50mph", weight: "Varies" },
          { name: "8000W Kit", motor: "8000W", battery: "72V Custom", topSpeed: "60mph", weight: "Varies" }
        ]
      }
    ]
  },

  "EM3ev": {
    country: "China/International",
    website: "https://em3ev.com",
    models: [
      {
        model: "High Power Builds",
        variants: [
          { name: "Custom Sur-Ron Build", motor: "8000W", battery: "72V 50Ah", topSpeed: "55mph", weight: "130lbs" },
          { name: "BBSHD 3000W Build", motor: "3000W", battery: "52V 30Ah", topSpeed: "40mph", weight: "80lbs" }
        ]
      }
    ]
  },

  "Unit Pack Power": {
    country: "China",
    website: "https://www.aliexpress.com/store/331339",
    models: [
      {
        model: "Battery Packs",
        variants: [
          { name: "72V Triangle Pack", motor: "N/A", battery: "72V 50Ah", topSpeed: "N/A", weight: "25lbs" },
          { name: "60V Rear Rack", motor: "N/A", battery: "60V 40Ah", topSpeed: "N/A", weight: "20lbs" }
        ]
      }
    ]
  },

  // MORE HIGH-POWER BRANDS
  "Watt Wagons": {
    country: "USA",
    website: "https://wattwagons.com",
    models: [
      {
        model: "Ultimate Commuter Pro",
        variants: [
          { name: "UC Pro", motor: "2300W", battery: "52V 21Ah", topSpeed: "35mph", weight: "75lbs" },
          { name: "UC Pro FS", motor: "2300W", battery: "52V 21Ah", topSpeed: "35mph", weight: "85lbs" }
        ]
      },
      {
        model: "Hydra",
        variants: [
          { name: "Hydra", motor: "2300W", battery: "52V 21Ah", topSpeed: "35mph", weight: "80lbs" }
        ]
      }
    ]
  },

  "M2S Bikes": {
    country: "USA",
    website: "https://m2sbikes.com",
    models: [
      {
        model: "All Terrain",
        variants: [
          { name: "All Terrain Pro", motor: "1000W", battery: "48V 17.5Ah", topSpeed: "28mph", weight: "70lbs" },
          { name: "Fatty", motor: "750W", battery: "48V 13Ah", topSpeed: "28mph", weight: "65lbs" }
        ]
      }
    ]
  },

  "FLX Bike": {
    country: "USA",
    models: [
      {
        model: "Trail",
        variants: [
          { name: "Trail", motor: "1000W", battery: "48V 14Ah", topSpeed: "28mph", weight: "65lbs" }
        ]
      }
    ]
  },

  "Optibike": {
    country: "USA",
    website: "https://optibike.com",
    models: [
      {
        model: "R22 Everest",
        variants: [
          { name: "R22 Everest", motor: "1700W", battery: "52V 32Ah", topSpeed: "35mph", weight: "80lbs" }
        ]
      },
      {
        model: "Pioneer Allroad",
        variants: [
          { name: "Pioneer Allroad", motor: "1000W", battery: "48V 17Ah", topSpeed: "28mph", weight: "70lbs" }
        ]
      }
    ]
  },

  "Frey Bike": {
    country: "China",
    website: "https://www.freybike.com",
    models: [
      {
        model: "EX",
        variants: [
          { name: "EX Pro", motor: "1000W", battery: "48V 17.5Ah", topSpeed: "32mph", weight: "75lbs" },
          { name: "EX Plus", motor: "1500W", battery: "52V 19.2Ah", topSpeed: "35mph", weight: "78lbs" }
        ]
      },
      {
        model: "AM1000",
        variants: [
          { name: "AM1000 V6", motor: "1000W", battery: "48V 17.5Ah", topSpeed: "30mph", weight: "70lbs" }
        ]
      }
    ]
  },

  "Roshan Motors": {
    country: "India",
    models: [
      {
        model: "High Speed",
        variants: [
          { name: "RS-3000", motor: "3000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "110lbs" }
        ]
      }
    ]
  },

  // CONVERSION SPECIALISTS
  "California eBike": {
    country: "USA",
    models: [
      {
        model: "Conversion Builds",
        variants: [
          { name: "5000W Fat Tire", motor: "5000W", battery: "72V 35Ah", topSpeed: "50mph", weight: "90lbs" },
          { name: "3000W Commuter", motor: "3000W", battery: "52V 20Ah", topSpeed: "40mph", weight: "70lbs" }
        ]
      }
    ]
  },

  "Electric Bike Technologies": {
    country: "USA",
    models: [
      {
        model: "Custom Builds",
        variants: [
          { name: "Police Bike", motor: "1500W", battery: "52V 25Ah", topSpeed: "32mph", weight: "80lbs" },
          { name: "Cargo Hauler", motor: "2000W", battery: "48V 30Ah", topSpeed: "30mph", weight: "100lbs" }
        ]
      }
    ]
  },

  // SCOOTER-BIKE HYBRIDS
  "Varla": {
    country: "USA",
    website: "https://varlascooter.com",
    models: [
      {
        model: "Eagle One",
        variants: [
          { name: "Eagle One", motor: "2000W", battery: "52V 23.4Ah", topSpeed: "40mph", weight: "77lbs", notes: "Scooter-bike hybrid" }
        ]
      },
      {
        model: "Pegasus",
        variants: [
          { name: "Pegasus", motor: "1000W", battery: "48V 18.2Ah", topSpeed: "25mph", weight: "62lbs" }
        ]
      }
    ]
  },

  "Wolf King GT": {
    country: "China",
    models: [
      {
        model: "GT",
        variants: [
          { name: "Wolf King GT", motor: "5400W", battery: "72V 35Ah", topSpeed: "62mph", weight: "123lbs", notes: "Standing scooter" }
        ]
      }
    ]
  },

  "Dualtron": {
    country: "South Korea",
    website: "https://minimotorsusa.com",
    models: [
      {
        model: "Thunder",
        variants: [
          { name: "Thunder 2", motor: "5400W", battery: "72V 35Ah", topSpeed: "50mph", weight: "95lbs", notes: "Standing scooter" }
        ]
      },
      {
        model: "Ultra",
        variants: [
          { name: "Ultra 2", motor: "5400W", battery: "60V 35Ah", topSpeed: "50mph", weight: "85lbs" }
        ]
      }
    ]
  },

  // ELECTRIC MOTORCYCLE STYLE (NON-REGISTERED)
  "Sondors": {
    country: "USA",
    website: "https://sondors.com",
    models: [
      {
        model: "Metacycle",
        variants: [
          { name: "Metacycle", motor: "8000W", battery: "4kWh", topSpeed: "80mph", weight: "200lbs", notes: "E-motorcycle sold as off-road" }
        ]
      },
      {
        model: "MadMods",
        variants: [
          { name: "MadMods", motor: "750W", battery: "48V 17.5Ah", topSpeed: "20mph", weight: "73lbs" }
        ]
      }
    ]
  },

  "CSC Motorcycles": {
    country: "USA",
    website: "https://cscmotorcycles.com",
    models: [
      {
        model: "City Slicker",
        variants: [
          { name: "City Slicker", motor: "3000W", battery: "60V 20Ah", topSpeed: "45mph", weight: "220lbs" }
        ]
      }
    ]
  },

  // MORE CHINESE HIGH-POWER BRANDS
  "Boeray": {
    country: "China",
    models: [
      {
        model: "High Power",
        variants: [
          { name: "BR-8000", motor: "8000W", battery: "72V 40Ah", topSpeed: "55mph", weight: "140lbs" }
        ]
      }
    ]
  },

  "XDAO": {
    country: "China",
    models: [
      {
        model: "Electric Dirt",
        variants: [
          { name: "XDAO-3000", motor: "3000W", battery: "60V 30Ah", topSpeed: "40mph", weight: "120lbs" }
        ]
      }
    ]
  },

  "Aostirmotor": {
    country: "China",
    website: "https://aostirmotor.com",
    models: [
      {
        model: "Electric Mountain",
        variants: [
          { name: "S18-1500", motor: "1500W", battery: "48V 15Ah", topSpeed: "35mph", weight: "75lbs" },
          { name: "S05-750", motor: "750W", battery: "48V 13Ah", topSpeed: "28mph", weight: "65lbs" }
        ]
      }
    ]
  },

  "Cyrusher": {
    country: "China",
    website: "https://www.cyrusher.com",
    models: [
      {
        model: "Ranger",
        variants: [
          { name: "Ranger", motor: "750W", battery: "48V 17Ah", topSpeed: "28mph", weight: "77lbs" }
        ]
      },
      {
        model: "XF800",
        variants: [
          { name: "XF800", motor: "1000W", battery: "48V 12.8Ah", topSpeed: "28mph", weight: "70lbs" }
        ]
      }
    ]
  },

  // EUROPEAN GRAY AREA BRANDS
  "Moustache Bikes": {
    country: "France",
    website: "https://www.moustachebikes.com",
    models: [
      {
        model: "Game",
        variants: [
          { name: "Game 8", motor: "625W", battery: "625Wh", topSpeed: "28mph", weight: "58lbs", notes: "Speed pedelec" }
        ]
      }
    ]
  },

  "KTM": {
    country: "Austria",
    models: [
      {
        model: "Freeride E-XC",
        variants: [
          { name: "Freeride E-XC", motor: "5500W", battery: "60V 50Ah", topSpeed: "50mph", weight: "180lbs", notes: "Electric dirt bike" }
        ]
      }
    ]
  },

  "Stark Future": {
    country: "Spain",
    website: "https://www.starkfuture.com",
    models: [
      {
        model: "Varg",
        variants: [
          { name: "Varg", motor: "11000W", battery: "6kWh", topSpeed: "50mph", weight: "242lbs", notes: "Electric motocross" }
        ]
      }
    ]
  },

  // MORE USA BRANDS
  "Electric Motion USA": {
    country: "USA",
    website: "https://electricmotionusa.com",
    models: [
      {
        model: "Trials Bikes",
        variants: [
          { name: "EM 5.7 Escape", motor: "6000W", battery: "60V 41Ah", topSpeed: "46mph", weight: "167lbs" },
          { name: "EM 5.7 Pure", motor: "11000W", battery: "60V 50Ah", topSpeed: "45mph", weight: "154lbs" }
        ]
      }
    ]
  },

  "UBCO": {
    country: "New Zealand",
    website: "https://ubco.com",
    models: [
      {
        model: "2X2",
        variants: [
          { name: "2X2 Work Bike", motor: "1000W", battery: "48V 31Ah", topSpeed: "30mph", weight: "144lbs" },
          { name: "2X2 Adventure", motor: "1000W", battery: "48V 41Ah", topSpeed: "30mph", weight: "150lbs" }
        ]
      }
    ]
  },

  "Husqvarna": {
    country: "Sweden",
    models: [
      {
        model: "E-Pilen",
        variants: [
          { name: "E-Pilen Concept", motor: "8000W", battery: "4kWh", topSpeed: "60mph", weight: "154lbs", notes: "Electric motorcycle concept" }
        ]
      }
    ]
  },

  "GasGas": {
    country: "Spain",
    models: [
      {
        model: "EC",
        variants: [
          { name: "EC-E 5", motor: "5500W", battery: "60V 50Ah", topSpeed: "50mph", weight: "180lbs", notes: "Electric enduro" }
        ]
      }
    ]
  },

  // DIRECT-TO-CONSUMER HIGH POWER
  "Zooz Bikes": {
    country: "USA",
    website: "https://zoozbikes.com",
    models: [
      {
        model: "Urban Ultralight",
        variants: [
          { name: "Urban Ultralight 750", motor: "750W", battery: "36V 10.5Ah", topSpeed: "20mph", weight: "37lbs" },
          { name: "Urban Ultralight 1100", motor: "1100W", battery: "48V 14Ah", topSpeed: "28mph", weight: "45lbs" }
        ]
      }
    ]
  },

  "E-Cells": {
    country: "USA",
    website: "https://e-cells.com",
    models: [
      {
        model: "Super Monarch",
        variants: [
          { name: "Super Monarch Crown", motor: "3000W", battery: "52V 30Ah", topSpeed: "40mph", weight: "95lbs" }
        ]
      }
    ]
  },

  "Flux Mopeds": {
    country: "USA",
    models: [
      {
        model: "EM1",
        variants: [
          { name: "EM1", motor: "3000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "165lbs" }
        ]
      }
    ]
  },

  // CUSTOM BUILDERS & SHOPS
  "Electric Bike Outpost": {
    country: "USA",
    models: [
      {
        model: "Custom Builds",
        variants: [
          { name: "Fat Tire Monster", motor: "5000W", battery: "72V 35Ah", topSpeed: "50mph", weight: "100lbs" },
          { name: "Commuter Beast", motor: "3000W", battery: "52V 25Ah", topSpeed: "40mph", weight: "75lbs" }
        ]
      }
    ]
  },

  "Area 13 eBikes": {
    country: "USA",
    models: [
      {
        model: "High Performance",
        variants: [
          { name: "Destroyer", motor: "8000W", battery: "72V 40Ah", topSpeed: "60mph", weight: "120lbs" },
          { name: "Stealth Fighter", motor: "5000W", battery: "60V 35Ah", topSpeed: "50mph", weight: "95lbs" }
        ]
      }
    ]
  },

  // MORE CHINESE MANUFACTURERS
  "Surron Official": {
    country: "China",
    website: "https://www.surron.com",
    models: [
      {
        model: "Light Bee Series",
        variants: [
          { name: "Light Bee X Road Legal", motor: "6000W", battery: "60V 32Ah", topSpeed: "28mph", weight: "118lbs", notes: "Street legal version" },
          { name: "Light Bee X Off-Road", motor: "6000W", battery: "60V 32Ah", topSpeed: "47mph", weight: "118lbs" }
        ]
      }
    ]
  },

  "TaoTao": {
    country: "China",
    models: [
      {
        model: "Raptor",
        variants: [
          { name: "Raptor 125", motor: "3000W", battery: "60V 20Ah", topSpeed: "35mph", weight: "110lbs" }
        ]
      }
    ]
  },

  "Aima Technology": {
    country: "China",
    website: "https://aimatech.com",
    models: [
      {
        model: "High Speed Series",
        variants: [
          { name: "A500", motor: "2000W", battery: "60V 20Ah", topSpeed: "35mph", weight: "90lbs" },
          { name: "A800", motor: "3000W", battery: "60V 30Ah", topSpeed: "45mph", weight: "110lbs" }
        ]
      }
    ]
  },

  "Evoking": {
    country: "China",
    models: [
      {
        model: "Urban Series",
        variants: [
          { name: "Urban 1000", motor: "1000W", battery: "48V 15Ah", topSpeed: "30mph", weight: "70lbs" },
          { name: "Urban 3000", motor: "3000W", battery: "60V 25Ah", topSpeed: "40mph", weight: "85lbs" }
        ]
      }
    ]
  },

  "Windgoo": {
    country: "China",
    models: [
      {
        model: "Electric Scooter-Bikes",
        variants: [
          { name: "M17", motor: "1200W", battery: "48V 12Ah", topSpeed: "25mph", weight: "55lbs" },
          { name: "M11", motor: "800W", battery: "36V 6Ah", topSpeed: "15mph", weight: "35lbs" }
        ]
      }
    ]
  },

  // SPECIALTY HIGH-POWER SCOOTERS
  "Weped": {
    country: "South Korea",
    models: [
      {
        model: "SST",
        variants: [
          { name: "SST", motor: "2400W", battery: "60V 21Ah", topSpeed: "37mph", weight: "88lbs", notes: "Standing scooter" }
        ]
      },
      {
        model: "FF",
        variants: [
          { name: "FF", motor: "5400W", battery: "72V 32Ah", topSpeed: "50mph", weight: "110lbs" }
        ]
      }
    ]
  },

  "Zero 10X": {
    country: "China",
    models: [
      {
        model: "10X",
        variants: [
          { name: "Zero 10X", motor: "2000W", battery: "52V 18Ah", topSpeed: "40mph", weight: "77lbs", notes: "Standing scooter" }
        ]
      }
    ]
  },

  "Emove": {
    country: "USA",
    website: "https://voro-motors.com",
    models: [
      {
        model: "Cruiser",
        variants: [
          { name: "Cruiser", motor: "1600W", battery: "52V 30Ah", topSpeed: "25mph", weight: "77lbs", notes: "Standing scooter" }
        ]
      },
      {
        model: "Roadrunner",
        variants: [
          { name: "Roadrunner Pro", motor: "1000W", battery: "48V 15.6Ah", topSpeed: "28mph", weight: "55lbs" }
        ]
      }
    ]
  },

  // EUROPEAN HIGH-POWER BRANDS
  "VanMoof": {
    country: "Netherlands",
    website: "https://vanmoof.com",
    models: [
      {
        model: "V",
        variants: [
          { name: "VanMoof V", motor: "700W", battery: "48V 23Ah", topSpeed: "31mph", weight: "123lbs", notes: "High-speed e-bike" }
        ]
      }
    ]
  },

  "Tinbot": {
    country: "China",
    models: [
      {
        model: "TB",
        variants: [
          { name: "TB-ES01", motor: "5000W", battery: "60V 32Ah", topSpeed: "45mph", weight: "118lbs", notes: "Sur-Ron clone" }
        ]
      }
    ]
  },

  "CFMOTO": {
    country: "China",
    models: [
      {
        model: "Zeeho",
        variants: [
          { name: "Cyber", motor: "3000W", battery: "60V 30Ah", topSpeed: "50mph", weight: "190lbs", notes: "Electric motorcycle styled" }
        ]
      }
    ]
  },

  // DELIVERY/COMMERCIAL GRAY AREA
  "Cake Bikes": {
    country: "Sweden",
    website: "https://ridecake.com",
    models: [
      {
        model: "Work Series",
        variants: [
          { name: "Ösa Work", motor: "8500W", battery: "72V 50Ah", topSpeed: "28mph", weight: "145lbs", notes: "Commercial use" }
        ]
      }
    ]
  },

  "Swobbee": {
    country: "Germany",
    models: [
      {
        model: "Delivery",
        variants: [
          { name: "Cargo Pro", motor: "1500W", battery: "48V 20Ah", topSpeed: "25mph", weight: "85lbs", notes: "Last-mile delivery" }
        ]
      }
    ]
  },

  // FOLDING HIGH-POWER EBIKES
  "Eahora": {
    country: "China",
    website: "https://eahorabike.com",
    models: [
      {
        model: "X7 Plus",
        variants: [
          { name: "X7 Plus", motor: "750W", battery: "48V 14Ah", topSpeed: "28mph", weight: "77lbs", notes: "Folding fat tire" }
        ]
      },
      {
        model: "M1P",
        variants: [
          { name: "M1P", motor: "500W", battery: "48V 10.4Ah", topSpeed: "20mph", weight: "55lbs" }
        ]
      }
    ]
  },

  "Shengmilo": {
    country: "China",
    models: [
      {
        model: "MX",
        variants: [
          { name: "MX03", motor: "1000W", battery: "48V 15Ah", topSpeed: "35mph", weight: "75lbs", notes: "Fat tire" },
          { name: "MX05", motor: "750W", battery: "48V 12.8Ah", topSpeed: "28mph", weight: "68lbs" }
        ]
      }
    ]
  },

  // ELECTRIC SCOOTER MANUFACTURERS (SEATED)
  "Rion": {
    country: "South Korea",
    models: [
      {
        model: "RE90",
        variants: [
          { name: "RE90", motor: "27000W", battery: "72V 50Ah", topSpeed: "75mph", weight: "143lbs", notes: "Extreme performance scooter" }
        ]
      }
    ]
  },

  "Bronco": {
    country: "China",
    models: [
      {
        model: "Extreme",
        variants: [
          { name: "Bronco Extreme 11", motor: "5600W", battery: "72V 32Ah", topSpeed: "56mph", weight: "121lbs", notes: "Standing scooter" }
        ]
      }
    ]
  },

  // INDIAN MANUFACTURERS
  "Hero Electric": {
    country: "India",
    website: "https://heroelectric.in",
    models: [
      {
        model: "AE-47",
        variants: [
          { name: "AE-47", motor: "4000W", battery: "72V 30Ah", topSpeed: "45mph", weight: "120lbs", notes: "High-speed version" }
        ]
      }
    ]
  },

  "Ather Energy": {
    country: "India",
    website: "https://atherenergy.com",
    models: [
      {
        model: "450X",
        variants: [
          { name: "450X", motor: "5400W", battery: "72V 50Ah", topSpeed: "50mph", weight: "165lbs", notes: "Smart scooter" }
        ]
      }
    ]
  },

  // BRAZILIAN MANUFACTURERS
  "Voltz Motors": {
    country: "Brazil",
    models: [
      {
        model: "EVS",
        variants: [
          { name: "EVS Sport", motor: "3000W", battery: "60V 30Ah", topSpeed: "40mph", weight: "140lbs" }
        ]
      }
    ]
  },

  // RECENTLY DISCOVERED BRANDS (from systematic scraping)
  "Lectric eBikes": {
    country: "USA",
    website: "https://lectricebikes.com",
    founded: 2019,
    headquarters: "Phoenix, Arizona",
    models: [
      {
        model: "ONE",
        variants: [
          {
            name: "Lectric ONE",
            motor: "1200W peak / 750W nominal",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "68lbs",
            range: "60 miles",
            price: "$1,999",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Folding commuter with high power"
          }
        ]
      },
      {
        model: "XPeak",
        variants: [
          {
            name: "XPeak",
            motor: "1310W peak / 750W nominal",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "73lbs",
            range: "60 miles",
            price: "$1,699",
            availability: "In stock",
            suspension: "Front and rear",
            brakes: "Hydraulic disc",
            notes: "Off-road capable"
          }
        ]
      }
    ]
  },

  "C3STROM": {
    country: "Sweden",
    website: "https://c3strom.com",
    models: [
      {
        model: "Astro Pro",
        variants: [
          {
            name: "Astro Pro",
            motor: "750W nominal / 1500W peak",
            battery: "48V 19.2Ah",
            topSpeed: "28mph",
            weight: "77lbs",
            range: "75 miles",
            price: "$3,299",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Premium commuter with high torque"
          }
        ]
      }
    ]
  },

  "Spark Cycleworks": {
    country: "USA",
    models: [
      {
        model: "Bandit",
        variants: [
          {
            name: "Bandit",
            motor: "1000W",
            battery: "52V 17.5Ah",
            topSpeed: "35mph",
            weight: "65lbs",
            range: "40 miles",
            price: "$3,500-4,000",
            availability: "Made to order",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "High-performance mountain e-bike"
          }
        ]
      }
    ]
  },

  "Surface 604": {
    country: "Canada",
    website: "https://surface604.com",
    models: [
      {
        model: "Boar Hunter",
        variants: [
          {
            name: "Boar Hunter",
            motor: "1000W",
            battery: "48V 17.5Ah",
            topSpeed: "32mph",
            weight: "78lbs",
            range: "35 miles",
            price: "$2,899",
            availability: "In stock",
            suspension: "Front and rear",
            brakes: "Hydraulic disc",
            notes: "Hunting/utility e-bike"
          }
        ]
      }
    ]
  },

  // ADDITIONAL US MANUFACTURERS
  "Addmotor": {
    country: "USA",
    website: "https://addmotor.com",
    models: [
      {
        model: "MOTAN",
        variants: [
          {
            name: "MOTAN M-450",
            motor: "750W",
            battery: "48V 16Ah",
            topSpeed: "25mph",
            weight: "75lbs",
            range: "55 miles",
            price: "$1,699",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Mechanical disc",
            notes: "Fat tire e-bike"
          }
        ]
      },
      {
        model: "CITYTRI",
        variants: [
          {
            name: "E-310",
            motor: "750W",
            battery: "48V 20Ah",
            topSpeed: "15mph",
            weight: "95lbs",
            range: "55 miles",
            price: "$1,999",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Disc brakes",
            notes: "Electric tricycle"
          }
        ]
      }
    ]
  },

  "Magnum Bikes": {
    country: "USA",
    website: "https://magnumbikes.com",
    models: [
      {
        model: "Peak",
        variants: [
          {
            name: "Peak T5",
            motor: "750W",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "65lbs",
            range: "50 miles",
            price: "$1,899",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Mountain e-bike"
          }
        ]
      }
    ]
  },

  "Ride Scoozy": {
    country: "USA",
    models: [
      {
        model: "Electric Bikes",
        variants: [
          {
            name: "Urban Commuter",
            motor: "1000W",
            battery: "48V 17.5Ah",
            topSpeed: "32mph",
            weight: "68lbs",
            range: "45 miles",
            price: "$2,200",
            availability: "In stock",
            notes: "High-power commuter"
          }
        ]
      }
    ]
  },

  // MORE EUROPEAN BRANDS
  "Stromer": {
    country: "Switzerland",
    website: "https://stromerbike.com",
    founded: 2009,
    headquarters: "Oberwangen, Switzerland",
    models: [
      {
        model: "ST7",
        variants: [
          {
            name: "ST7",
            motor: "850W",
            battery: "72V 17.2Ah",
            topSpeed: "28mph",
            weight: "62lbs",
            range: "110 miles",
            price: "$8,999",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Premium speed pedelec"
          }
        ]
      },
      {
        model: "ST5",
        variants: [
          {
            name: "ST5 Limited",
            motor: "650W",
            battery: "48V 17.2Ah",
            topSpeed: "28mph",
            weight: "57lbs",
            range: "90 miles",
            price: "$5,999",
            availability: "In stock",
            notes: "High-end commuter"
          }
        ]
      }
    ]
  },

  "Riese & Müller": {
    country: "Germany",
    website: "https://r-m.de",
    founded: 1993,
    headquarters: "Darmstadt, Germany",
    models: [
      {
        model: "Superdelite",
        variants: [
          {
            name: "Superdelite GT rohloff HS",
            motor: "625W Bosch Performance Speed",
            battery: "75V 25Ah dual battery",
            topSpeed: "28mph",
            weight: "74lbs",
            range: "120 miles",
            price: "$8,999",
            availability: "Special order",
            suspension: "Full suspension",
            brakes: "Magura MT5",
            notes: "Premium cargo e-bike"
          }
        ]
      }
    ]
  },

  // EMERGING US BRANDS
  "RadRunner": {
    country: "USA",
    website: "https://radpowerbikes.com",
    founded: 2015,
    headquarters: "Seattle, Washington",
    models: [
      {
        model: "RadRunner",
        variants: [
          {
            name: "RadRunner 3 Plus",
            motor: "750W geared hub",
            battery: "48V 14Ah",
            topSpeed: "20mph",
            weight: "65lbs",
            range: "45 miles",
            price: "$1,999",
            availability: "In stock",
            suspension: "None (rigid)",
            brakes: "Mechanical disc",
            notes: "Utility e-bike with cargo capacity"
          }
        ]
      },
      {
        model: "RadRover",
        variants: [
          {
            name: "RadRover 6 Plus",
            motor: "750W direct drive",
            battery: "48V 14Ah",
            topSpeed: "25mph",
            weight: "69lbs",
            range: "45 miles",
            price: "$1,999",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Fat tire all-terrain"
          }
        ]
      }
    ]
  },

  "Heybike": {
    country: "USA",
    website: "https://heybike.com",
    models: [
      {
        model: "Mars",
        variants: [
          {
            name: "Mars 2.0",
            motor: "750W brushless",
            battery: "48V 15Ah",
            topSpeed: "28mph",
            weight: "69lbs",
            range: "60 miles",
            price: "$1,399",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Mechanical disc",
            notes: "Folding fat tire e-bike"
          }
        ]
      },
      {
        model: "Ranger",
        variants: [
          {
            name: "Ranger S",
            motor: "750W",
            battery: "48V 15Ah",
            topSpeed: "28mph",
            weight: "77lbs",
            range: "65 miles",
            price: "$1,699",
            availability: "In stock",
            suspension: "Front and rear",
            brakes: "Hydraulic disc",
            notes: "Full suspension mountain"
          }
        ]
      }
    ]
  },

  "Wallke": {
    country: "USA",
    website: "https://wallke.com",
    models: [
      {
        model: "X3 Pro",
        variants: [
          {
            name: "X3 Pro",
            motor: "750W rear hub",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "65lbs",
            range: "60 miles",
            price: "$1,599",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Fat tire commuter"
          }
        ]
      }
    ]
  },

  // JAPANESE MANUFACTURERS  
  "Yamaha": {
    country: "Japan",
    website: "https://yamaha-motor.com",
    founded: 1955,
    headquarters: "Iwata, Japan",
    models: [
      {
        model: "Cross Core RC",
        variants: [
          {
            name: "Cross Core RC",
            motor: "500W PWseries SE",
            battery: "500Wh",
            topSpeed: "20mph",
            weight: "53lbs",
            range: "55 miles",
            price: "$3,399",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Premium urban commuter"
          }
        ]
      },
      {
        model: "YDX-MORO",
        variants: [
          {
            name: "YDX-MORO 07",
            motor: "500W PWseries",
            battery: "500Wh",
            topSpeed: "20mph",
            weight: "51lbs",
            range: "50 miles",
            price: "$4,199",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Shimano hydraulic",
            notes: "E-MTB"
          }
        ]
      }
    ]
  },

  // MORE CHINESE HIGH-POWER BRANDS
  "LANKELEISI": {
    country: "China",
    models: [
      {
        model: "G650",
        variants: [
          {
            name: "G650",
            motor: "1000W",
            battery: "48V 12.8Ah",
            topSpeed: "25mph",
            weight: "57lbs",
            range: "35 miles",
            price: "$1,200-1,500",
            availability: "Import/Alibaba",
            suspension: "Front and rear",
            brakes: "Disc brakes",
            notes: "Folding mountain e-bike"
          }
        ]
      }
    ]
  },

  "GUNAI": {
    country: "China",
    models: [
      {
        model: "MX02S",
        variants: [
          {
            name: "MX02S",
            motor: "1000W",
            battery: "48V 17Ah",
            topSpeed: "40mph",
            weight: "70lbs",
            range: "50 miles",
            price: "$1,500-1,800",
            availability: "Import/Alibaba",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            notes: "High-power mountain e-bike"
          }
        ]
      }
    ]
  },

  "BEZIOR": {
    country: "China",
    models: [
      {
        model: "XF200",
        variants: [
          {
            name: "XF200",
            motor: "1000W",
            battery: "48V 12.8Ah",
            topSpeed: "25mph",
            weight: "59lbs",
            range: "40 miles",
            price: "$900-1,200",
            availability: "Import/Alibaba",
            suspension: "Front and rear",
            brakes: "Disc brakes",
            notes: "Folding fat tire"
          }
        ]
      }
    ]
  },

  "DUOTTS": {
    country: "China",
    models: [
      {
        model: "F26",
        variants: [
          {
            name: "F26",
            motor: "750W",
            battery: "48V 20Ah",
            topSpeed: "28mph",
            weight: "66lbs",
            range: "80 miles",
            price: "$1,300-1,600",
            availability: "Import/Online",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Long-range fat tire"
          }
        ]
      }
    ]
  },

  // AUSTRALIAN BRANDS
  "Stealth Electric Bikes": {
    country: "Australia",
    website: "https://stealthelectricbikes.com",
    founded: 2008,
    headquarters: "Brisbane, Australia",
    models: [
      {
        model: "P-7",
        variants: [
          {
            name: "P-7",
            motor: "2000W",
            battery: "52V 15Ah",
            topSpeed: "35mph",
            weight: "88lbs",
            range: "35 miles",
            price: "$4,995",
            availability: "Made to order",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Stealth design urban"
          }
        ]
      },
      {
        model: "B-52",
        variants: [
          {
            name: "B-52 Bomber",
            motor: "5200W",
            battery: "72V 38.5Ah",
            topSpeed: "50mph",
            weight: "116lbs",
            range: "50 miles",
            price: "$8,995",
            availability: "Made to order",
            suspension: "Full suspension",
            brakes: "Magura MT7",
            notes: "High-performance off-road"
          }
        ]
      }
    ]
  },

  // CANADIAN BRANDS
  "Biktrix": {
    country: "Canada",
    website: "https://biktrix.com",
    founded: 2014,
    headquarters: "Saskatoon, Saskatchewan",
    models: [
      {
        model: "Juggernaut Ultra",
        variants: [
          {
            name: "Juggernaut Ultra Beast",
            motor: "1000W Bafang Ultra",
            battery: "52V 17.5Ah",
            topSpeed: "30mph",
            weight: "75lbs",
            range: "35 miles",
            price: "$3,499",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Magura MT5",
            notes: "High-torque fat tire"
          },
          {
            name: "Juggernaut Ultra FS Pro",
            motor: "1000W Bafang Ultra",
            battery: "52V 17.5Ah",
            topSpeed: "30mph",
            weight: "85lbs",
            range: "35 miles",
            price: "$4,199",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Magura MT5",
            notes: "Full suspension version"
          }
        ]
      },
      {
        model: "Stunner X",
        variants: [
          {
            name: "Stunner X",
            motor: "750W rear hub",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "65lbs",
            range: "50 miles",
            price: "$1,899",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Step-through commuter"
          }
        ]
      }
    ]
  },

  // SOUTH AFRICAN BRANDS
  "Thok": {
    country: "Italy",
    website: "https://thok-ebikes.com",
    models: [
      {
        model: "TK01",
        variants: [
          {
            name: "TK01 R",
            motor: "630W Shimano EP8",
            battery: "504Wh",
            topSpeed: "20mph",
            weight: "52lbs",
            range: "40 miles",
            price: "$4,999",
            availability: "Special order",
            suspension: "Full suspension",
            brakes: "Shimano XT",
            notes: "Premium e-MTB"
          }
        ]
      }
    ]
  },

  // MEXICAN BRANDS
  "Electrica": {
    country: "Mexico",
    models: [
      {
        model: "Urbana",
        variants: [
          {
            name: "Urbana 1000",
            motor: "1000W",
            battery: "48V 13Ah",
            topSpeed: "35mph",
            weight: "60lbs",
            range: "40 miles",
            price: "$1,800",
            availability: "Regional",
            suspension: "Front fork",
            brakes: "Disc brakes",
            notes: "Latin American market"
          }
        ]
      }
    ]
  },

  // EMERGING DIRECT-TO-CONSUMER BRANDS
  "Bosch eBike Systems": {
    country: "Germany",
    website: "https://bosch-ebike.com",
    founded: 1886,
    headquarters: "Stuttgart, Germany",
    models: [
      {
        model: "Performance Line CX",
        variants: [
          {
            name: "CX Gen 4",
            motor: "625W / 85Nm torque",
            battery: "500Wh-750Wh options",
            topSpeed: "20mph",
            weight: "7.7lbs (motor only)",
            range: "Varies by bike",
            price: "OEM component",
            availability: "OEM partners",
            suspension: "N/A",
            brakes: "N/A",
            notes: "High-performance e-MTB motor system"
          }
        ]
      },
      {
        model: "Performance Line Speed",
        variants: [
          {
            name: "Speed Gen 4",
            motor: "625W / 85Nm torque",
            battery: "500Wh-750Wh options",
            topSpeed: "28mph",
            weight: "8.8lbs (motor only)",
            range: "Varies by bike",
            price: "OEM component",
            availability: "OEM partners",
            notes: "Speed pedelec motor system"
          }
        ]
      }
    ]
  },

  "Bafang": {
    country: "China",
    website: "https://bafang-e.com",
    founded: 2003,
    headquarters: "Suzhou, China",
    models: [
      {
        model: "Ultra Max",
        variants: [
          {
            name: "M620 Ultra",
            motor: "1000W / 160Nm torque",
            battery: "Custom integration",
            topSpeed: "Varies by config",
            weight: "9.5lbs (motor only)",
            range: "Varies by bike",
            price: "$800-1,200 (kit)",
            availability: "DIY/OEM",
            suspension: "N/A",
            brakes: "N/A",
            notes: "High-power mid-drive system"
          }
        ]
      },
      {
        model: "BBSHD",
        variants: [
          {
            name: "BBSHD 1000W",
            motor: "1000W / 120Nm torque",
            battery: "Custom 48V-52V",
            topSpeed: "35mph+",
            weight: "11lbs (motor only)",
            range: "Varies by config",
            price: "$400-600 (kit)",
            availability: "DIY market",
            notes: "Popular DIY conversion kit"
          }
        ]
      }
    ]
  },

  // FRENCH MANUFACTURERS
  "Moustache Bikes": {
    country: "France",
    website: "https://moustachebikes.com",
    founded: 2011,
    headquarters: "Épinal, France",
    models: [
      {
        model: "Game",
        variants: [
          {
            name: "Game 8",
            motor: "625W Bosch Performance Speed",
            battery: "625Wh",
            topSpeed: "28mph",
            weight: "58lbs",
            range: "75 miles",
            price: "$5,499",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Magura MT5",
            notes: "Speed pedelec mountain"
          }
        ]
      },
      {
        model: "Samedi",
        variants: [
          {
            name: "Samedi 29 Trail",
            motor: "625W Bosch Performance CX",
            battery: "625Wh",
            topSpeed: "20mph",
            weight: "55lbs",
            range: "80 miles",
            price: "$4,999",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Shimano XT",
            notes: "Trail e-MTB"
          }
        ]
      }
    ]
  },

  "O2feel": {
    country: "France",
    website: "https://o2feel.com",
    models: [
      {
        model: "Vern",
        variants: [
          {
            name: "Vern Ultimate",
            motor: "250W Shimano EP8",
            battery: "630Wh",
            topSpeed: "20mph",
            weight: "52lbs",
            range: "90 miles",
            price: "$4,299",
            availability: "European market",
            suspension: "Front fork",
            brakes: "Shimano hydraulic",
            notes: "Premium French engineering"
          }
        ]
      }
    ]
  },

  // SCANDINAVIAN BRANDS
  "Biomega": {
    country: "Denmark",
    website: "https://biomega.dk",
    models: [
      {
        model: "EIN",
        variants: [
          {
            name: "EIN",
            motor: "250W rear hub",
            battery: "504Wh",
            topSpeed: "15mph",
            weight: "37lbs",
            range: "50 miles",
            price: "$2,999",
            availability: "European market",
            suspension: "None",
            brakes: "Disc brakes",
            notes: "Minimalist Danish design"
          }
        ]
      }
    ]
  },

  "Pilen": {
    country: "Sweden",
    models: [
      {
        model: "Lyx",
        variants: [
          {
            name: "Lyx",
            motor: "250W Brose",
            battery: "630Wh",
            topSpeed: "20mph",
            weight: "48lbs",
            range: "75 miles",
            price: "$3,799",
            availability: "European market",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Swedish premium urban"
          }
        ]
      }
    ]
  },

  // SOUTH AMERICAN EXPANSION
  "Sense": {
    country: "Brazil",
    models: [
      {
        model: "Impulse",
        variants: [
          {
            name: "Impulse E-Trail",
            motor: "350W",
            battery: "36V 10.4Ah",
            topSpeed: "25kmh",
            weight: "22kg",
            range: "50km",
            price: "R$7,999 (~$1,600)",
            availability: "Brazil market",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Brazilian mountain e-bike"
          }
        ]
      }
    ]
  },

  "Caloi": {
    country: "Brazil",
    website: "https://caloi.com",
    founded: 1898,
    headquarters: "São Paulo, Brazil",
    models: [
      {
        model: "E-Vibe",
        variants: [
          {
            name: "E-Vibe Urban",
            motor: "350W rear hub",
            battery: "36V 10.4Ah",
            topSpeed: "25kmh",
            weight: "23kg",
            range: "40km",
            price: "R$5,999 (~$1,200)",
            availability: "Brazil market",
            suspension: "Front fork",
            brakes: "V-brakes",
            notes: "Historic Brazilian brand"
          }
        ]
      }
    ]
  },

  // ASIAN EXPANSION - SOUTH KOREA
  "Alton Sports": {
    country: "South Korea",
    models: [
      {
        model: "DP-779",
        variants: [
          {
            name: "DP-779",
            motor: "350W",
            battery: "36V 10.4Ah",
            topSpeed: "25kmh",
            weight: "24kg",
            range: "45km",
            price: "₩1,200,000 (~$900)",
            availability: "Korean market",
            suspension: "Front fork",
            brakes: "V-brakes",
            notes: "Korean domestic market"
          }
        ]
      }
    ]
  },

  // MIDDLE EASTERN BRANDS
  "Gazelle": {
    country: "Netherlands",
    website: "https://gazelle.com",
    founded: 1892,
    headquarters: "Dieren, Netherlands",
    models: [
      {
        model: "Ultimate",
        variants: [
          {
            name: "Ultimate C380 HMB",
            motor: "625W Bosch Performance Speed",
            battery: "625Wh",
            topSpeed: "28mph",
            weight: "61lbs",
            range: "75 miles",
            price: "$4,999",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Magura MT4",
            notes: "Dutch premium speed pedelec"
          }
        ]
      },
      {
        model: "Arroyo",
        variants: [
          {
            name: "Arroyo C8 HMB",
            motor: "400W Bosch Active Line Plus",
            battery: "500Wh",
            topSpeed: "20mph",
            weight: "55lbs",
            range: "60 miles",
            price: "$3,299",
            availability: "In stock",
            suspension: "Front fork",
            brakes: "Rim brakes",
            notes: "Classic Dutch city bike"
          }
        ]
      }
    ]
  },

  // AFRICAN MARKET
  "Qhubeka": {
    country: "South Africa",
    models: [
      {
        model: "E-Qhubeka",
        variants: [
          {
            name: "Rural Commuter",
            motor: "250W rear hub",
            battery: "36V 8Ah",
            topSpeed: "25kmh",
            weight: "25kg",
            range: "35km",
            price: "R15,000 (~$800)",
            availability: "South Africa",
            suspension: "None",
            brakes: "V-brakes",
            notes: "Social impact e-mobility"
          }
        ]
      }
    ]
  },

  // EMERGING TECHNOLOGY COMPANIES
  "Specialized": {
    country: "USA",
    website: "https://specialized.com",
    founded: 1974,
    headquarters: "Morgan Hill, California",
    models: [
      {
        model: "Turbo Levo",
        variants: [
          {
            name: "Turbo Levo SL Expert",
            motor: "320W Specialized SL 1.1",
            battery: "320Wh + 160Wh extender",
            topSpeed: "20mph",
            weight: "38lbs",
            range: "50-80 miles",
            price: "$5,500",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "SRAM Code R",
            notes: "Lightweight e-MTB"
          }
        ]
      },
      {
        model: "Turbo Vado SL",
        variants: [
          {
            name: "Vado SL 5.0",
            motor: "320W Specialized SL 1.1",
            battery: "320Wh",
            topSpeed: "28mph",
            weight: "33lbs",
            range: "80 miles",
            price: "$4,250",
            availability: "In stock",
            suspension: "None",
            brakes: "Hydraulic disc",
            notes: "Lightweight speed pedelec"
          }
        ]
      }
    ]
  },

  // STARTUP INNOVATION
  "Serial 1": {
    country: "USA",
    website: "https://serial1.com",
    founded: 2020,
    headquarters: "Milwaukee, Wisconsin",
    models: [
      {
        model: "RUSH/CTY",
        variants: [
          {
            name: "RUSH/CTY Speed",
            motor: "350W Brose mid-drive",
            battery: "529Wh",
            topSpeed: "28mph",
            weight: "46lbs",
            range: "95 miles",
            price: "$4,399",
            availability: "In stock",
            suspension: "None",
            brakes: "Hydraulic disc",
            notes: "Harley-Davidson heritage brand"
          }
        ]
      }
    ]
  },

  "Cowboy": {
    country: "Belgium",
    website: "https://cowboy.com",
    founded: 2017,
    headquarters: "Brussels, Belgium",
    models: [
      {
        model: "Cowboy 4",
        variants: [
          {
            name: "Cowboy 4",
            motor: "250W rear hub",
            battery: "360Wh",
            topSpeed: "15mph",
            weight: "41lbs",
            range: "43 miles",
            price: "$2,990",
            availability: "European market",
            suspension: "None",
            brakes: "Hydraulic disc",
            notes: "Connected urban e-bike"
          }
        ]
      }
    ]
  },

  // EASTERN EUROPEAN BRANDS
  "Kross": {
    country: "Poland",
    website: "https://kross.eu",
    founded: 1990,
    headquarters: "Przasnysz, Poland",
    models: [
      {
        model: "Trans",
        variants: [
          {
            name: "Trans Hybrid",
            motor: "500W Bosch Performance CX",
            battery: "625Wh",
            topSpeed: "20mph",
            weight: "55lbs",
            range: "70 miles",
            price: "€3,499 (~$3,800)",
            availability: "European market",
            suspension: "Full suspension",
            brakes: "Shimano hydraulic",
            notes: "Polish mountain e-bike"
          }
        ]
      }
    ]
  },

  "Author": {
    country: "Czech Republic",
    website: "https://authorbikes.com",
    models: [
      {
        model: "Jam",
        variants: [
          {
            name: "Jam E:5",
            motor: "500W Bosch Performance CX",
            battery: "625Wh",
            topSpeed: "20mph",
            weight: "52lbs",
            range: "65 miles",
            price: "€3,799 (~$4,100)",
            availability: "European market",
            suspension: "Full suspension",
            brakes: "SRAM Guide",
            notes: "Czech trail e-MTB"
          }
        ]
      }
    ]
  },

  // RUSSIAN & CIS BRANDS
  "Forward": {
    country: "Russia",
    models: [
      {
        model: "Enigma",
        variants: [
          {
            name: "Enigma E-trail",
            motor: "350W rear hub",
            battery: "36V 13Ah",
            topSpeed: "25kmh",
            weight: "26kg",
            range: "60km",
            price: "₽80,000 (~$900)",
            availability: "CIS market",
            suspension: "Front fork",
            brakes: "Disc brakes",
            notes: "Russian domestic production"
          }
        ]
      }
    ]
  },

  // TURKISH MANUFACTURERS
  "Bianchi Turkey": {
    country: "Turkey",
    models: [
      {
        model: "E-Spillo",
        variants: [
          {
            name: "E-Spillo Active",
            motor: "250W Bosch Active Line",
            battery: "400Wh",
            topSpeed: "25kmh",
            weight: "22kg",
            range: "80km",
            price: "₺35,000 (~$1,200)",
            availability: "Turkish market",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Historic Italian brand, Turkish assembly"
          }
        ]
      }
    ]
  },

  // ISRAELI HIGH-TECH
  "Smartmotion": {
    country: "New Zealand",
    website: "https://smartmotion.co.nz",
    models: [
      {
        model: "Hypersonic",
        variants: [
          {
            name: "Hypersonic",
            motor: "1000W rear hub",
            battery: "48V 17.5Ah",
            topSpeed: "50kmh",
            weight: "28kg",
            range: "80km",
            price: "NZ$4,999 (~$3,100)",
            availability: "ANZ market",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            notes: "High-speed commuter"
          }
        ]
      }
    ]
  },

  // INDIAN MANUFACTURERS
  "Hero Electric": {
    country: "India",
    website: "https://heroelectric.in",
    founded: 2007,
    headquarters: "New Delhi, India",
    models: [
      {
        model: "Photon",
        variants: [
          {
            name: "Photon",
            motor: "250W BLDC",
            battery: "48V 24Ah Li-ion",
            topSpeed: "25kmh",
            weight: "57kg",
            range: "84km",
            price: "₹62,000 (~$750)",
            availability: "Indian market",
            suspension: "Telescopic front",
            brakes: "Drum brakes",
            notes: "Indian scooter-style e-bike"
          }
        ]
      },
      {
        model: "Optima",
        variants: [
          {
            name: "Optima CX",
            motor: "1200W BLDC",
            battery: "48V 28Ah",
            topSpeed: "45kmh",
            weight: "85kg",
            range: "60km",
            price: "₹78,000 (~$950)",
            availability: "Indian market",
            suspension: "Telescopic front, dual rear",
            brakes: "Disc brakes",
            notes: "High-power Indian e-scooter"
          }
        ]
      }
    ]
  },

  "Revolt Motors": {
    country: "India",
    website: "https://revoltmotors.com",
    founded: 2019,
    headquarters: "Gurugram, India",
    models: [
      {
        model: "RV400",
        variants: [
          {
            name: "RV400",
            motor: "3000W BLDC",
            battery: "72V 3.24kWh",
            topSpeed: "85kmh",
            weight: "108kg",
            range: "150km",
            price: "₹1,29,463 (~$1,570)",
            availability: "Indian market",
            suspension: "USD front, monoshock rear",
            brakes: "Single disc F/R",
            notes: "AI-enabled electric motorcycle"
          }
        ]
      }
    ]
  },

  // SOUTHEAST ASIAN BRANDS
  "Treeletrik": {
    country: "Malaysia",
    models: [
      {
        model: "Terra",
        variants: [
          {
            name: "Terra",
            motor: "250W rear hub",
            battery: "36V 10.4Ah",
            topSpeed: "25kmh",
            weight: "22kg",
            range: "50km",
            price: "RM3,500 (~$750)",
            availability: "Malaysian market",
            suspension: "Front fork",
            brakes: "V-brakes",
            notes: "Malaysian urban commuter"
          }
        ]
      }
    ]
  },

  "Selis": {
    country: "Indonesia",
    models: [
      {
        model: "Blis",
        variants: [
          {
            name: "Blis",
            motor: "600W BLDC",
            battery: "48V 20Ah",
            topSpeed: "40kmh",
            weight: "55kg",
            range: "60km",
            price: "Rp25,000,000 (~$1,650)",
            availability: "Indonesian market",
            suspension: "Telescopic front",
            brakes: "Disc brakes",
            notes: "Indonesian electric scooter"
          }
        ]
      }
    ]
  },

  // PHILIPPINE BRANDS
  "Bemac": {
    country: "Philippines",
    models: [
      {
        model: "Electric Trike",
        variants: [
          {
            name: "E-Trike",
            motor: "1000W DC",
            battery: "48V 20Ah",
            topSpeed: "35kmh",
            weight: "150kg",
            range: "40km",
            price: "₱85,000 (~$1,500)",
            availability: "Philippine market",
            suspension: "Leaf spring rear",
            brakes: "Drum brakes",
            notes: "Philippine jeepney-style e-trike"
          }
        ]
      }
    ]
  },

  // AFRICAN EXPANSION
  "Roam": {
    country: "Kenya",
    website: "https://roam.africa",
    founded: 2017,
    headquarters: "Nairobi, Kenya",
    models: [
      {
        model: "Roam Air",
        variants: [
          {
            name: "Roam Air",
            motor: "2700W hub motor",
            battery: "72V 50Ah LFP",
            topSpeed: "90kmh",
            weight: "93kg",
            range: "180km",
            price: "$2,500",
            availability: "East Africa",
            suspension: "Telescopic front, dual rear",
            brakes: "Disc brakes F/R",
            notes: "African-designed electric motorcycle"
          }
        ]
      }
    ]
  },

  "Ampersand": {
    country: "Rwanda",
    website: "https://www.ampersand.solar",
    founded: 2016,
    headquarters: "Kigali, Rwanda",
    models: [
      {
        model: "Moto",
        variants: [
          {
            name: "Ampersand Moto",
            motor: "3000W BLDC",
            battery: "Swappable 2.5kWh",
            topSpeed: "75kmh",
            weight: "65kg",
            range: "75km per battery",
            price: "$1,200",
            availability: "Rwanda/East Africa",
            suspension: "Telescopic front",
            brakes: "Disc brakes",
            notes: "Battery-swapping motorcycle taxi"
          }
        ]
      }
    ]
  },

  // MIDDLE EASTERN EXPANSION
  "Electric Motion Middle East": {
    country: "UAE",
    models: [
      {
        model: "Desert",
        variants: [
          {
            name: "Desert Runner",
            motor: "5000W BLDC",
            battery: "72V 40Ah",
            topSpeed: "70kmh",
            weight: "85kg",
            range: "100km",
            price: "AED15,000 (~$4,100)",
            availability: "GCC market",
            suspension: "Long travel F/R",
            brakes: "Brembo disc",
            notes: "Desert-adapted e-bike"
          }
        ]
      }
    ]
  },

  // LATIN AMERICAN EXPANSION
  "Italika": {
    country: "Mexico",
    website: "https://italika.mx",
    founded: 2005,
    headquarters: "Toluca, Mexico",
    models: [
      {
        model: "Volt",
        variants: [
          {
            name: "Volt X",
            motor: "1500W BLDC",
            battery: "60V 20Ah",
            topSpeed: "65kmh",
            weight: "75kg",
            range: "60km",
            price: "$32,000 MXN (~$1,800)",
            availability: "Mexican market",
            suspension: "Telescopic front, dual rear",
            brakes: "Disc brakes",
            notes: "Mexican electric scooter"
          }
        ]
      }
    ]
  },

  "Starker": {
    country: "Colombia",
    website: "https://starker.co",
    models: [
      {
        model: "Stark",
        variants: [
          {
            name: "Stark City",
            motor: "500W rear hub",
            battery: "36V 10Ah",
            topSpeed: "25kmh",
            weight: "23kg",
            range: "50km",
            price: "$1,800,000 COP (~$450)",
            availability: "Colombian market",
            suspension: "Front fork",
            brakes: "Disc brakes",
            notes: "Colombian urban e-bike"
          }
        ]
      }
    ]
  },

  // NORDIC PREMIUM EXPANSION
  "Biomega Advanced": {
    country: "Denmark",
    website: "https://biomega.dk",
    models: [
      {
        model: "AMS",
        variants: [
          {
            name: "AMS",
            motor: "250W Shimano STEPS",
            battery: "504Wh internal",
            topSpeed: "25kmh",
            weight: "16kg",
            range: "100km",
            price: "€4,999 (~$5,400)",
            availability: "Nordic market",
            suspension: "None",
            brakes: "Hydraulic disc",
            notes: "Carbon fiber Danish premium"
          }
        ]
      }
    ]
  },

  // AUSTRALIAN EXPANSION
  "Leitner": {
    country: "Australia",
    models: [
      {
        model: "Performance",
        variants: [
          {
            name: "P1",
            motor: "750W Bafang",
            battery: "48V 17Ah",
            topSpeed: "45kmh",
            weight: "26kg",
            range: "80km",
            price: "AU$3,999 (~$2,700)",
            availability: "Australian market",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            notes: "Australian performance e-bike"
          }
        ]
      }
    ]
  },

  // CUSTOM BUILDERS & BOUTIQUE
  "E-Lux Electric Bikes": {
    country: "USA",
    website: "https://e-luxelectricbikes.com",
    models: [
      {
        model: "Tahoe",
        variants: [
          {
            name: "Tahoe GT",
            motor: "750W Bafang mid-drive",
            battery: "48V 17.5Ah Samsung",
            topSpeed: "28mph",
            weight: "65lbs",
            range: "60 miles",
            price: "$3,299",
            availability: "Made to order",
            suspension: "RockShox front",
            brakes: "Shimano hydraulic",
            notes: "Premium US assembly"
          }
        ]
      }
    ]
  },

  "Priority Bicycles": {
    country: "USA",
    website: "https://prioritybicycles.com",
    founded: 2014,
    headquarters: "New York, NY",
    models: [
      {
        model: "Current",
        variants: [
          {
            name: "Current",
            motor: "350W Bosch Active Line Plus",
            battery: "400Wh",
            topSpeed: "20mph",
            weight: "44lbs",
            range: "50 miles",
            price: "$2,299",
            availability: "In stock",
            suspension: "None",
            brakes: "Hydraulic disc",
            notes: "Belt drive, low maintenance"
          }
        ]
      }
    ]
  },

  // SPARK CYCLEWORKS (USA emerging)
  "Spark Cycleworks": {
    country: "USA",
    website: "https://sparkcycleworks.com",
    founded: 2020,
    headquarters: "Portland, Oregon, USA",
    focus: "High-performance adventure e-bikes",
    models: [
      {
        model: "Bandit",
        variants: [
          {
            name: "Bandit",
            motor: "1000W nominal Bafang Ultra",
            battery: "52V 17.5Ah",
            topSpeed: "35mph",
            weight: "70lbs",
            range: "50-80 miles", 
            price: "$4,799",
            availability: "Limited stock",
            suspension: "Full suspension",
            brakes: "4-piston hydraulic disc",
            frame: "Carbon fiber",
            notes: "Adventure/gravel focused"
          }
        ]
      }
    ]
  },

  // C3STROM (Germany/Asia)
  "C3STROM": {
    country: "Germany",
    website: "https://c3strom.com",
    founded: 2019,
    headquarters: "Hamburg, Germany",
    focus: "Premium urban mobility",
    models: [
      {
        model: "Astro Pro",
        variants: [
          {
            name: "Astro Pro",
            motor: "750W nominal Bafang M620",
            battery: "48V 17.5Ah LG",
            topSpeed: "28mph (45km/h)",
            weight: "65lbs",
            range: "60-100 miles",
            price: "$3,999",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum",
            display: "Color TFT",
            notes: "Premium urban commuter"
          }
        ]
      }
    ]
  },

  // SURFACE 604 (Canada)
  "Surface 604": {
    country: "Canada",
    website: "https://surface604.com",
    founded: 2014,
    headquarters: "Vancouver, BC, Canada",
    focus: "Hunting and outdoor recreation",
    models: [
      {
        model: "Boar Hunter",
        variants: [
          {
            name: "Boar Hunter",
            motor: "1000W nominal Bafang",
            battery: "48V 14Ah",
            topSpeed: "32mph",
            weight: "75lbs",
            range: "40-60 miles",
            price: "$2,799",
            availability: "In stock",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            accessories: "Gun rack compatible",
            notes: "Hunting/outdoor recreation focused"
          }
        ]
      }
    ]
  },

  // HIMIWAY (China/International)
  "Himiway": {
    country: "China",
    website: "https://himiwaybike.com",
    founded: 2017,
    headquarters: "Shenzhen, China",
    focus: "Fat tire adventure e-bikes",
    models: [
      {
        model: "Cobra Pro",
        variants: [
          {
            name: "Cobra Pro",
            motor: "1000W nominal Bafang",
            battery: "48V 20Ah Samsung",
            topSpeed: "28mph",
            weight: "77lbs",
            range: "60-80 miles",
            price: "$1,899",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum",
            tires: "26\" x 4\" fat tires",
            notes: "Full suspension fat bike"
          }
        ]
      },
      {
        model: "Zebra",
        variants: [
          {
            name: "Zebra Step-Thru",
            motor: "750W nominal",
            battery: "48V 17.5Ah",
            topSpeed: "25mph",
            weight: "65lbs",
            range: "60-80 miles",
            price: "$1,599",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Step-through aluminum",
            notes: "Commuter-focused design"
          }
        ]
      }
    ]
  },

  // ENGWE (China/Global)
  "Engwe": {
    country: "China",
    website: "https://engwe-bikes.com",
    founded: 2018,
    headquarters: "Dongguan, China",
    focus: "Affordable fat tire e-bikes",
    models: [
      {
        model: "Engine Pro 2.0",
        variants: [
          {
            name: "Engine Pro 2.0",
            motor: "750W nominal",
            battery: "48V 16Ah",
            topSpeed: "28mph",
            weight: "77lbs",
            range: "65+ miles",
            price: "$1,399",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Folding fat bike",
            tires: "20\" x 4\" fat tires",
            notes: "Folding full suspension"
          }
        ]
      },
      {
        model: "EP-2 Pro",
        variants: [
          {
            name: "EP-2 Pro",
            motor: "750W nominal",
            battery: "48V 12.8Ah",
            topSpeed: "28mph",
            weight: "68lbs",
            range: "45-65 miles",
            price: "$1,199",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Folding",
            notes: "Budget folding e-bike"
          }
        ]
      }
    ]
  },

  // CYRUSHER (China/International)
  "Cyrusher": {
    country: "China", 
    website: "https://cyrusher.com",
    founded: 2014,
    headquarters: "Dongguan, China",
    focus: "Fat tire and mountain e-bikes",
    models: [
      {
        model: "Kommoda",
        variants: [
          {
            name: "Kommoda",
            motor: "750W nominal Bafang",
            battery: "48V 17.5Ah Samsung",
            topSpeed: "28mph",
            weight: "79lbs",
            range: "55-80 miles",
            price: "$1,699",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            tires: "26\" x 4\" Kenda",
            notes: "Full suspension fat bike"
          }
        ]
      },
      {
        model: "XF900",
        variants: [
          {
            name: "XF900",
            motor: "750W nominal",
            battery: "48V 17Ah",
            topSpeed: "28mph", 
            weight: "73lbs",
            range: "50-70 miles",
            price: "$1,599",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum mountain bike",
            notes: "Full suspension mountain e-bike"
          }
        ]
      }
    ]
  },

  // ADDMOTOR (China/USA)
  "Addmotor": {
    country: "China/USA",
    website: "https://addmotor.com",
    founded: 2017,
    headquarters: "Los Angeles, CA / Guangzhou, China",
    focus: "Electric trikes and cargo bikes",
    models: [
      {
        model: "MOTAN M-5800",
        variants: [
          {
            name: "MOTAN M-5800",
            motor: "750W nominal Bafang",
            battery: "48V 20Ah Samsung",
            topSpeed: "28mph",
            weight: "88lbs",
            range: "55-85 miles",
            price: "$2,599",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum cargo bike",
            cargoCapacity: "440lbs",
            notes: "Long-tail cargo design"
          }
        ]
      },
      {
        model: "GRANDTAN M-340",
        variants: [
          {
            name: "GRANDTAN M-340",
            motor: "750W nominal",
            battery: "48V 20Ah",
            topSpeed: "20mph",
            weight: "105lbs",
            range: "55+ miles",
            price: "$2,199",
            availability: "In stock",
            type: "Electric trike",
            brakes: "Hydraulic disc",
            cargoCapacity: "350lbs rear basket",
            notes: "Three-wheel electric trike"
          }
        ]
      }
    ]
  },

  // RIDE1UP (USA)
  "Ride1UP": {
    country: "USA",
    website: "https://ride1up.com",
    founded: 2018,
    headquarters: "San Diego, California, USA",
    focus: "Direct-to-consumer value e-bikes",
    models: [
      {
        model: "Prodigy",
        variants: [
          {
            name: "Prodigy",
            motor: "750W nominal Bafang mid-drive",
            battery: "48V 14Ah Samsung",
            topSpeed: "28mph",
            weight: "50lbs",
            range: "30-60 miles",
            price: "$1,695",
            availability: "In stock",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            transmission: "Shimano 9-speed",
            frame: "Aluminum",
            notes: "Mid-drive value option"
          }
        ]
      },
      {
        model: "Revv 1",
        variants: [
          {
            name: "Revv 1",
            motor: "1200W peak / 750W nominal hub",
            battery: "48V 15Ah",
            topSpeed: "33mph",
            weight: "73lbs",
            range: "30-45 miles",
            price: "$1,295",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum moped style",
            notes: "Moped-style design"
          }
        ]
      }
    ]
  },

  // EAHORA (China emerging)
  "Eahora": {
    country: "China",
    website: "https://eahorabike.com", 
    founded: 2019,
    headquarters: "Dongguan, China",
    focus: "Performance and cargo e-bikes",
    models: [
      {
        model: "AZARIA",
        variants: [
          {
            name: "AZARIA XC200",
            motor: "750W nominal rear hub",
            battery: "48V 15Ah removable",
            topSpeed: "28mph",
            weight: "63lbs",
            range: "50-80 miles",
            price: "$1,399",
            availability: "In stock",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Aluminum step-through",
            notes: "Urban commuter design"
          }
        ]
      },
      {
        model: "ROMEO PRO",
        variants: [
          {
            name: "ROMEO PRO",
            motor: "1000W nominal Bafang",
            battery: "48V 20Ah Samsung",
            topSpeed: "32mph",
            weight: "79lbs",
            range: "60-90 miles",
            price: "$1,899",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            tires: "26\" x 4\"",
            notes: "High-power fat bike"
          }
        ]
      }
    ]
  },

  // VELOTRIC (USA/China)
  "Velotric": {
    country: "USA/China",
    website: "https://velotricbike.com",
    founded: 2020,
    headquarters: "New York, NY / Shenzhen, China", 
    focus: "Urban mobility and commuting",
    models: [
      {
        model: "Thunder 1",
        variants: [
          {
            name: "Thunder 1",
            motor: "750W nominal rear hub",
            battery: "48V 15.6Ah Samsung",
            topSpeed: "28mph",
            weight: "58lbs",
            range: "60+ miles",
            price: "$1,699",
            availability: "In stock",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Aluminum",
            display: "Color LCD",
            notes: "Urban adventure bike"
          }
        ]
      },
      {
        model: "Discover 1",
        variants: [
          {
            name: "Discover 1",
            motor: "500W nominal rear hub",
            battery: "48V 14Ah",
            topSpeed: "25mph",
            weight: "49lbs",
            range: "65+ miles",
            price: "$1,299",
            availability: "In stock",
            suspension: "None (rigid)",
            brakes: "Hydraulic disc",
            frame: "Lightweight aluminum",
            notes: "Lightweight commuter"
          }
        ]
      }
    ]
  },

  // FREY BIKE (China premium)
  "Frey Bike": {
    country: "China",
    website: "https://freybike.com",
    founded: 2015,
    headquarters: "Jinhua, Zhejiang, China",
    focus: "Premium high-performance e-bikes",
    models: [
      {
        model: "CC Fat",
        variants: [
          {
            name: "CC Fat",
            motor: "1500W nominal Bafang Ultra",
            battery: "52V 19.2Ah Samsung",
            topSpeed: "35mph",
            weight: "75lbs",
            range: "60-100 miles",
            price: "$3,299",
            availability: "Made to order",
            suspension: "Full suspension",
            brakes: "Magura MT5 4-piston",
            frame: "Aluminum fat bike",
            tires: "26\" x 4.8\" Vee Tire",
            notes: "High-performance fat bike"
          }
        ]
      },
      {
        model: "AM1000",
        variants: [
          {
            name: "AM1000",
            motor: "1000W nominal Bafang M620",
            battery: "52V 17.5Ah",
            topSpeed: "32mph",
            weight: "65lbs",
            range: "50-80 miles",
            price: "$2,799",
            availability: "Made to order",
            suspension: "Full suspension",
            brakes: "Shimano hydraulic",
            frame: "Aluminum mountain bike",
            notes: "All-mountain performance"
          }
        ]
      }
    ]
  },

  // QUIETKAT (USA hunting/outdoor)
  "QuietKat": {
    country: "USA",
    website: "https://quietkat.com",
    founded: 2012,
    headquarters: "Eagle, Colorado, USA",
    focus: "Hunting and outdoor recreation",
    models: [
      {
        model: "Apex",
        variants: [
          {
            name: "Apex",
            motor: "1000W nominal Bafang Ultra",
            battery: "48V 21Ah",
            topSpeed: "28mph",
            weight: "73lbs",
            range: "40-60 miles",
            price: "$4,999",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            tires: "26\" x 4\" Maxxis",
            accessories: "Hunting accessories available",
            notes: "Premium hunting e-bike"
          }
        ]
      },
      {
        model: "Ranger",
        variants: [
          {
            name: "Ranger",
            motor: "750W nominal hub",
            battery: "48V 14Ah",
            topSpeed: "20mph",
            weight: "68lbs",
            range: "25-40 miles",
            price: "$2,799",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            notes: "Entry-level hunting model"
          }
        ]
      }
    ]
  },

  // BEZIOR (China budget)
  "Bezior": {
    country: "China",
    website: "https://beziorbike.com",
    founded: 2018,
    headquarters: "Dongguan, China",
    focus: "Budget folding e-bikes",
    models: [
      {
        model: "X1500",
        variants: [
          {
            name: "X1500",
            motor: "1000W nominal rear hub",
            battery: "48V 12.8Ah",
            topSpeed: "28mph",
            weight: "66lbs",
            range: "50-60 miles",
            price: "$999",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Folding aluminum",
            tires: "20\" x 4\" fat tires",
            notes: "Budget full suspension folder"
          }
        ]
      },
      {
        model: "M26",
        variants: [
          {
            name: "M26",
            motor: "500W nominal",
            battery: "48V 10Ah",
            topSpeed: "25mph",
            weight: "55lbs",
            range: "35-50 miles",
            price: "$799",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Mechanical disc",
            frame: "Folding aluminum",
            notes: "Ultra-budget folder"
          }
        ]
      }
    ]
  },

  // LECTRIC EBIKES (USA verified from scraping)
  "Lectric eBikes": {
    country: "USA",
    website: "https://lectricebikes.com",
    founded: 2019,
    headquarters: "Phoenix, Arizona, USA",
    focus: "Affordable fat tire e-bikes",
    models: [
      {
        model: "XPedition",
        variants: [
          {
            name: "XPedition Cargo",
            motor: "1310W peak / 750W nominal Bafang",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "73lbs",
            range: "45+ miles",
            price: "$1,699",
            availability: "In stock",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            cargoCapacity: "450lbs total payload",
            notes: "Cargo e-bike with passenger seating"
          }
        ]
      },
      {
        model: "XP 3.0",
        variants: [
          {
            name: "XP 3.0 Step-Thru",
            motor: "850W peak / 500W nominal",
            battery: "48V 10.4Ah",
            topSpeed: "28mph",
            weight: "64lbs",
            range: "25-45 miles",
            price: "$999",
            availability: "In stock",
            suspension: "Front suspension fork",
            brakes: "Mechanical disc",
            notes: "Folding fat tire design"
          }
        ]
      },
      {
        model: "ONE",
        variants: [
          {
            name: "Lectric ONE",
            motor: "1200W peak / 750W nominal mid-drive",
            battery: "48V 14Ah",
            topSpeed: "28mph",
            weight: "65lbs",
            range: "60+ miles",
            price: "$2,199",
            availability: "Pre-order",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            transmission: "Enviolo CVT",
            notes: "Premium full-suspension commuter"
          }
        ]
      }
    ]
  },

  // GOTRAX (USA scooter brand expanding to bikes)
  "GoTrax": {
    country: "USA",
    website: "https://gotrax.com",
    founded: 2017,
    headquarters: "Plano, Texas, USA",
    focus: "Electric scooters and budget e-bikes",
    models: [
      {
        model: "CTI Fat Tire",
        variants: [
          {
            name: "CTI Fat Tire",
            motor: "750W rear hub",
            battery: "48V 10.4Ah",
            topSpeed: "20mph",
            weight: "57lbs",
            range: "26 miles",
            price: "$899",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Mechanical disc",
            frame: "Aluminum",
            tires: "20\" x 4\" fat tires",
            notes: "Budget entry-level"
          }
        ]
      }
    ]
  },

  // NAKTO (China/USA budget)
  "Nakto": {
    country: "China/USA",
    website: "https://nakto.com",
    founded: 2014,
    headquarters: "Los Angeles, CA / Dongguan, China",
    focus: "Ultra-budget e-bikes",
    models: [
      {
        model: "Fat Tire",
        variants: [
          {
            name: "26\" Fat Tire",
            motor: "300W rear hub",
            battery: "36V 10Ah",
            topSpeed: "25mph",
            weight: "57lbs",
            range: "22-35 miles",
            price: "$699",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Mechanical disc",
            frame: "Steel",
            notes: "Ultra-budget option"
          }
        ]
      }
    ]
  },

  // AOSTIRMOTOR (China emerging)
  "Aostirmotor": {
    country: "China",
    website: "https://aostirmotor.com",
    founded: 2019,
    headquarters: "Dongguan, China",
    focus: "High-power fat tire e-bikes",
    models: [
      {
        model: "S18",
        variants: [
          {
            name: "S18-1500",
            motor: "1500W rear hub",
            battery: "48V 20Ah Samsung",
            topSpeed: "31mph",
            weight: "85lbs",
            range: "55-90 miles",
            price: "$1,899",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            tires: "26\" x 4\" CST",
            notes: "High-power full suspension"
          }
        ]
      }
    ]
  },

  // ELEGLIDE (China emerging)
  "Eleglide": {
    country: "China",
    website: "https://eleglide.com",
    founded: 2020,
    headquarters: "Shenzhen, China",
    focus: "Premium affordable e-bikes",
    models: [
      {
        model: "M1 Plus",
        variants: [
          {
            name: "M1 Plus",
            motor: "250W/500W switchable",
            battery: "36V 12.5Ah removable",
            topSpeed: "25mph",
            weight: "55lbs",
            range: "65+ miles",
            price: "$899",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Dual disc",
            frame: "Aluminum",
            notes: "Dual power mode"
          }
        ]
      }
    ]
  },

  // SAMEBIKE (China manufacturer)
  "Samebike": {
    country: "China",
    website: "https://samebike.com",
    founded: 2016,
    headquarters: "Dongguan, China",
    focus: "Folding and fat tire e-bikes",
    models: [
      {
        model: "LO26-II",
        variants: [
          {
            name: "LO26-II FT",
            motor: "500W rear hub",
            battery: "48V 10.4Ah",
            topSpeed: "25mph",
            weight: "65lbs",
            range: "35-60 miles",
            price: "$1,099",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Folding aluminum",
            tires: "26\" x 4\" fat tires",
            notes: "Folding full suspension fat bike"
          }
        ]
      }
    ]
  },

  // ONEMILE (China emerging)
  "OneMile": {
    country: "China",
    website: "https://onemile-ebike.com",
    founded: 2020,
    headquarters: "Dongguan, China",
    focus: "Urban commuter e-bikes",
    models: [
      {
        model: "Scrambler S",
        variants: [
          {
            name: "Scrambler S",
            motor: "750W rear hub",
            battery: "48V 15Ah removable",
            topSpeed: "28mph",
            weight: "68lbs",
            range: "50-80 miles",
            price: "$1,599",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum scrambler style",
            notes: "Retro scrambler design"
          }
        ]
      }
    ]
  },

  // VELOWAVE (Canada/China)
  "Velowave": {
    country: "Canada/China",
    website: "https://velowave.ca",
    founded: 2021,
    headquarters: "Vancouver, BC / Dongguan, China",
    focus: "Cold weather e-bikes",
    models: [
      {
        model: "Ranger",
        variants: [
          {
            name: "Ranger Fat Tire",
            motor: "750W rear hub",
            battery: "48V 15Ah Samsung",
            topSpeed: "28mph",
            weight: "70lbs",
            range: "60+ miles",
            price: "$1,399",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum",
            tires: "26\" x 4\" studded compatible",
            notes: "Cold weather optimized"
          }
        ]
      }
    ]
  },

  // MAGICYCLE (USA/China)
  "Magicycle": {
    country: "USA/China",
    website: "https://magicyclebike.com",
    founded: 2021,
    headquarters: "Los Angeles, CA / Shenzhen, China",
    focus: "Premium fat tire e-bikes",
    models: [
      {
        model: "Ocelot Pro",
        variants: [
          {
            name: "Ocelot Pro",
            motor: "750W Bafang rear hub",
            battery: "52V 20Ah Samsung",
            topSpeed: "28mph",
            weight: "75lbs",
            range: "80+ miles",
            price: "$1,899",
            availability: "In stock",
            suspension: "Full suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum fat bike",
            tires: "26\" x 4\" Kenda",
            notes: "Long-range full suspension"
          }
        ]
      }
    ]
  },

  // ESKUTE (UK/China)
  "Eskute": {
    country: "UK/China",
    website: "https://eskutebike.co.uk",
    founded: 2020,
    headquarters: "London, UK / Shenzhen, China",
    focus: "European compliant e-bikes",
    models: [
      {
        model: "Polluno",
        variants: [
          {
            name: "Polluno Pro",
            motor: "250W/500W dual mode",
            battery: "48V 15Ah removable",
            topSpeed: "15.5mph/28mph",
            weight: "55lbs",
            range: "60+ miles",
            price: "£1,699",
            availability: "In stock",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            frame: "Aluminum step-through",
            notes: "EU/UK dual compliance"
          }
        ]
      }
    ]
  },

  // DENGFU ELECTRIC
  "Dengfu Electric": {
    country: "China",
    website: "https://www.dengfubikes.com",
    founded: 2009,
    headquarters: "Shenzhen, Guangdong, China",
    models: [
      {
        model: "E-06",
        variants: [
          {
            name: "E-06 Carbon Fat",
            motor: "2000W Bafang M620 Ultra",
            battery: "48V 21Ah Samsung cells",
            topSpeed: "35mph (56km/h)",
            weight: "55lbs (25kg)",
            range: "40-60 miles",
            price: "$2,800-3,500",
            availability: "Made to order",
            suspension: "120mm front fork",
            brakes: "Hydraulic disc 180mm",
            tires: "26x4.0 fat tires",
            frame: "Full carbon fiber",
            notes: "OEM manufacturer, custom builds"
          }
        ]
      },
      {
        model: "E-10",
        variants: [
          {
            name: "E-10 Enduro",
            motor: "3000W peak / 1500W nominal",
            battery: "52V 20Ah LG cells",
            topSpeed: "40mph (64km/h)",
            weight: "62lbs (28kg)",
            range: "35-50 miles",
            price: "$3,200-3,800",
            availability: "4-6 weeks lead time",
            suspension: "160mm front/rear",
            brakes: "4-piston hydraulic",
            tires: "27.5x2.8",
            frame: "Carbon fiber",
            notes: "Full suspension enduro"
          }
        ]
      }
    ]
  },

  // TANTAN MOTOR
  "Tantan Motor": {
    country: "China",
    website: "https://tantanmotor.en.alibaba.com",
    founded: 2015,
    headquarters: "Wuxi, Jiangsu, China",
    models: [
      {
        model: "TT-R3",
        variants: [
          {
            name: "TT-R3 5000W",
            motor: "5000W hub motor",
            battery: "72V 35Ah lithium",
            topSpeed: "50mph (80km/h)",
            weight: "132lbs (60kg)",
            range: "50-70 miles",
            price: "$1,800-2,300",
            availability: "Bulk orders only",
            suspension: "Double crown fork",
            brakes: "Hydraulic disc",
            tires: "19/16 motorcycle tires",
            controller: "Sabvoton 72V 80A",
            notes: "Minimum order 10 units"
          }
        ]
      },
      {
        model: "TT-F1",
        variants: [
          {
            name: "TT-F1 8000W",
            motor: "8000W mid-drive",
            battery: "72V 40Ah",
            topSpeed: "60mph (96km/h)",
            weight: "143lbs (65kg)",
            range: "40-55 miles",
            price: "$2,500-3,000",
            availability: "Factory direct",
            suspension: "Long travel front/rear",
            brakes: "Motorcycle grade",
            notes: "High performance model"
          }
        ]
      }
    ]
  },

  // HONGDU EBIKE
  "Hongdu eBike": {
    country: "China",
    website: "https://www.hongduebike.com",
    founded: 2012,
    headquarters: "Tianjin, China",
    models: [
      {
        model: "HD-750",
        variants: [
          {
            name: "HD-750 Bomber",
            motor: "3000W rear hub",
            battery: "60V 30Ah",
            topSpeed: "45mph (72km/h)",
            weight: "88lbs (40kg)",
            range: "45-65 miles",
            price: "$1,500-2,000",
            availability: "In production",
            suspension: "Bomber fork copy",
            brakes: "203mm rotors",
            tires: "26x4.0 fat",
            notes: "Popular on Alibaba"
          }
        ]
      }
    ]
  },

  // QS MOTOR
  "QS Motor": {
    country: "China",
    website: "https://www.qs-motor.com",
    founded: 2005,
    headquarters: "Jiangsu, China",
    models: [
      {
        model: "273",
        variants: [
          {
            name: "QS273 8000W",
            motor: "8000W hub motor",
            battery: "72V-96V compatible",
            topSpeed: "70mph (112km/h)",
            weight: "35lbs (16kg) motor only",
            range: "Depends on battery",
            price: "$800-1,200 motor kit",
            availability: "In stock",
            controller: "Sabvoton/Kelly compatible",
            torque: "450Nm",
            notes: "Popular conversion motor"
          },
          {
            name: "QS273 10000W",
            motor: "10000W peak hub motor",
            battery: "96V recommended",
            topSpeed: "80mph (128km/h)",
            weight: "35lbs (16kg) motor only",
            range: "Depends on battery",
            price: "$1,000-1,500 motor kit",
            availability: "Made to order",
            notes: "Extreme performance motor"
          }
        ]
      },
      {
        model: "205",
        variants: [
          {
            name: "QS205 3000W",
            motor: "3000W V3 hub motor",
            battery: "48V-72V compatible",
            topSpeed: "45mph (72km/h)",
            weight: "25lbs (11kg) motor only",
            range: "Depends on battery",
            price: "$500-700 motor kit",
            availability: "Popular model",
            notes: "Mid-range conversion motor"
          }
        ]
      }
    ]
  },

  // CYCLONE MOTOR
  "Cyclone Motor": {
    country: "Taiwan/China",
    website: "https://cyclone-tw.com",
    founded: 2010,
    headquarters: "Taiwan",
    models: [
      {
        model: "Cyclone 3000W",
        variants: [
          {
            name: "Cyclone 3000W Mid Drive",
            motor: "3000W mid-drive",
            battery: "72V compatible",
            topSpeed: "50mph (80km/h)",
            weight: "20lbs (9kg) motor kit",
            range: "Depends on battery",
            price: "$750-950 kit",
            availability: "Regular stock",
            torque: "160Nm",
            notes: "Popular DIY mid-drive kit"
          }
        ]
      },
      {
        model: "Cyclone 6000W",
        variants: [
          {
            name: "Cyclone 6000W Typhoon",
            motor: "6000W mid-drive",
            battery: "72V-96V compatible",
            topSpeed: "65mph (104km/h)",
            weight: "28lbs (13kg) motor kit",
            range: "Depends on battery",
            price: "$1,200-1,500 kit",
            availability: "Limited production",
            torque: "250Nm",
            notes: "High performance kit"
          }
        ]
      }
    ]
  },

  // E-MOTO BRASIL
  "E-Moto Brasil": {
    country: "Brazil",
    website: "https://emotobrasil.com.br",
    founded: 2018,
    headquarters: "São Paulo, Brazil",
    models: [
      {
        model: "Voltz EV1",
        variants: [
          {
            name: "Voltz EV1 Sport",
            motor: "3000W hub motor",
            battery: "72V 30Ah lithium",
            topSpeed: "50mph (80km/h)",
            weight: "110lbs (50kg)",
            range: "60-80 miles",
            price: "R$18,000-22,000",
            availability: "Brazil market",
            suspension: "Inverted front fork",
            brakes: "CBS braking system",
            notes: "Popular in Brazil"
          }
        ]
      }
    ]
  },

  // OPAI ELECTRIC
  "Opai Electric": {
    country: "Indonesia",
    website: "https://opaielectric.com",
    founded: 2019,
    headquarters: "Jakarta, Indonesia",
    models: [
      {
        model: "Opai O2",
        variants: [
          {
            name: "O2 Adventure",
            motor: "2000W BLDC motor",
            battery: "60V 32Ah",
            topSpeed: "45mph (72km/h)",
            weight: "95lbs (43kg)",
            range: "50-70 miles",
            price: "$2,200-2,800",
            availability: "Southeast Asia",
            suspension: "Long travel suspension",
            brakes: "Dual disc",
            notes: "Designed for Indonesian terrain"
          }
        ]
      }
    ]
  },

  // ETRIX AFRICA
  "Etrix Africa": {
    country: "South Africa",
    website: "https://etrixafrica.com",
    founded: 2020,
    headquarters: "Cape Town, South Africa",
    models: [
      {
        model: "Bush Rider",
        variants: [
          {
            name: "Bush Rider 3000",
            motor: "3000W mid-drive",
            battery: "52V 35Ah",
            topSpeed: "40mph (64km/h)",
            weight: "108lbs (49kg)",
            range: "45-60 miles",
            price: "R45,000-55,000",
            availability: "Southern Africa",
            suspension: "Heavy duty front/rear",
            brakes: "4-piston hydraulic",
            tires: "29x3.0 tubeless",
            notes: "Built for African conditions"
          }
        ]
      }
    ]
  },

  // LVBU WHEEL
  "LVBU Technology": {
    country: "China",
    website: "https://www.lvbuwheel.com",
    founded: 2016,
    headquarters: "Guangzhou, China",
    models: [
      {
        model: "KF Series",
        variants: [
          {
            name: "KF-X2000",
            motor: "2000W all-in-one wheel",
            battery: "48V 20Ah integrated",
            topSpeed: "35mph (56km/h)",
            weight: "15lbs (7kg) wheel only",
            range: "40-50 miles",
            price: "$800-1,200",
            availability: "Global shipping",
            notes: "Complete wheel replacement system"
          }
        ]
      },
      {
        model: "BX Series",
        variants: [
          {
            name: "BX30 Boost",
            motor: "1500W hub motor",
            battery: "36V 15Ah bottle battery",
            topSpeed: "32mph (51km/h)",
            weight: "11lbs (5kg) system",
            range: "30-40 miles",
            price: "$600-800",
            availability: "In stock",
            notes: "Easy conversion kit"
          }
        ]
      }
    ]
  },

  // BOMBA ELECTRIC
  "Bomba Electric": {
    country: "Poland",
    website: "https://bombaelectric.eu",
    founded: 2021,
    headquarters: "Warsaw, Poland",
    models: [
      {
        model: "Bomber X",
        variants: [
          {
            name: "Bomber X Extreme",
            motor: "5000W Bafang M620",
            battery: "72V 35Ah",
            topSpeed: "55mph (88km/h)",
            weight: "121lbs (55kg)",
            range: "40-55 miles",
            price: "€4,500-5,500",
            availability: "EU market",
            suspension: "DNM USD-8 front, DNM RCP-2S rear",
            brakes: "Magura MT7",
            frame: "6061 aluminum",
            notes: "European high-performance"
          }
        ]
      }
    ]
  },

  // FLASH EBIKE
  "Flash eBike": {
    country: "Slovenia",
    website: "https://flashebike.com",
    founded: 2019,
    headquarters: "Ljubljana, Slovenia",
    models: [
      {
        model: "Flash V1",
        variants: [
          {
            name: "Flash V1 Forest",
            motor: "4000W custom motor",
            battery: "60V 40Ah",
            topSpeed: "50mph (80km/h)",
            weight: "115lbs (52kg)",
            range: "50-70 miles",
            price: "€3,800-4,500",
            availability: "Made to order",
            suspension: "FOX 36 front, FOX DHX2 rear",
            brakes: "Hope Tech 3 V4",
            notes: "Handmade in Slovenia"
          }
        ]
      }
    ]
  },

  // VOLTBIKE THAILAND
  "Voltbike Thailand": {
    country: "Thailand",
    website: "https://voltbikethailand.com",
    founded: 2020,
    headquarters: "Bangkok, Thailand",
    models: [
      {
        model: "Enduro Pro",
        variants: [
          {
            name: "Enduro Pro 3500",
            motor: "3500W mid-drive",
            battery: "60V 30Ah",
            topSpeed: "48mph (77km/h)",
            weight: "102lbs (46kg)",
            range: "40-60 miles",
            price: "฿85,000-105,000",
            availability: "Thailand/ASEAN",
            suspension: "RockShox components",
            brakes: "Shimano 4-piston",
            notes: "Thai-assembled"
          }
        ]
      }
    ]
  },

  // ECORIDE MEXICO
  "EcoRide Mexico": {
    country: "Mexico",
    website: "https://ecoridemx.com",
    founded: 2019,
    headquarters: "Mexico City, Mexico",
    models: [
      {
        model: "Azteca",
        variants: [
          {
            name: "Azteca Power",
            motor: "2500W hub motor",
            battery: "52V 25Ah",
            topSpeed: "40mph (64km/h)",
            weight: "92lbs (42kg)",
            range: "45-60 miles",
            price: "$35,000-45,000 MXN",
            availability: "Mexico/Central America",
            suspension: "Dual suspension",
            brakes: "Hydraulic disc",
            notes: "Mexican designed"
          }
        ]
      }
    ]
  },

  // MUSTANG ELECTRIC
  "Mustang Electric Bikes": {
    country: "Turkey",
    website: "https://mustangelectric.com.tr",
    founded: 2021,
    headquarters: "Istanbul, Turkey",
    models: [
      {
        model: "Stallion",
        variants: [
          {
            name: "Stallion 5000",
            motor: "5000W QS motor",
            battery: "72V 40Ah",
            topSpeed: "60mph (96km/h)",
            weight: "128lbs (58kg)",
            range: "50-65 miles",
            price: "₺120,000-150,000",
            availability: "Turkey/Middle East",
            suspension: "Premium components",
            brakes: "Brembo calipers",
            notes: "Premium Turkish brand"
          }
        ]
      }
    ]
  },

  // CUSTOM CRUISERS
  "Custom Cruisers Co": {
    country: "USA",
    website: "https://customcruisersco.com",
    founded: 2022,
    headquarters: "San Diego, California",
    models: [
      {
        model: "Beach Bomber",
        variants: [
          {
            name: "Beach Bomber 3000",
            motor: "3000W rear hub",
            battery: "52V 30Ah Samsung",
            topSpeed: "38mph (61km/h)",
            weight: "85lbs (39kg)",
            range: "40-55 miles",
            price: "$3,500-4,200",
            availability: "Custom builds",
            suspension: "Triple tree fork",
            brakes: "Dual hydraulic",
            frame: "Custom chopper style",
            notes: "California cruiser style"
          }
        ]
      }
    ]
  },

  // SABVOTON SYSTEMS
  "Sabvoton Systems": {
    country: "China",
    website: "https://sabvoton.com",
    founded: 2012,
    headquarters: "Shenzhen, China",
    models: [
      {
        model: "Controller Kits",
        variants: [
          {
            name: "SVMC72150 Kit",
            motor: "Compatible up to 15000W",
            battery: "24V-96V programmable",
            topSpeed: "Depends on motor",
            weight: "5lbs (2.3kg) controller",
            range: "Depends on setup",
            price: "$300-500",
            availability: "Worldwide",
            controller: "150A continuous",
            features: "Bluetooth programmable",
            notes: "Popular DIY controller"
          }
        ]
      }
    ]
  },

  // VECTOR EBIKES
  "Vector eBikes": {
    country: "India",
    website: "https://vectorebikes.in",
    founded: 2020,
    headquarters: "Bangalore, India",
    models: [
      {
        model: "Typhoon",
        variants: [
          {
            name: "Typhoon X1",
            motor: "3000W BLDC hub",
            battery: "72V 32Ah lithium",
            topSpeed: "55mph (88km/h)",
            weight: "115lbs (52kg)",
            range: "60-80 miles",
            price: "₹1,85,000-2,25,000",
            availability: "India market",
            suspension: "Telescopic front, dual rear",
            brakes: "Disc brakes front/rear",
            notes: "Premium Indian e-bike"
          }
        ]
      }
    ]
  },

  // KRANKED EBIKES
  "Kranked eBikes": {
    country: "Australia",
    website: "https://krankedebikes.com.au",
    founded: 2021,
    headquarters: "Melbourne, Australia",
    models: [
      {
        model: "Outback Beast",
        variants: [
          {
            name: "Outback Beast 4000",
            motor: "4000W Bafang Ultra",
            battery: "52V 35Ah",
            topSpeed: "45mph (72km/h)",
            weight: "110lbs (50kg)",
            range: "45-65 miles",
            price: "$5,500-6,500 AUD",
            availability: "Australia/NZ",
            suspension: "RockShox Yari/Super Deluxe",
            brakes: "SRAM Code RSC",
            tires: "27.5x3.0",
            notes: "Australian designed"
          }
        ]
      }
    ]
  },

  // ZUGO BIKE
  "Zugo Bike": {
    country: "USA",
    website: "https://zugobike.com",
    founded: 2021,
    headquarters: "Austin, Texas",
    models: [
      {
        model: "Rhino",
        variants: [
          {
            name: "Rhino V2",
            motor: "1200W geared hub",
            battery: "48V 17.5Ah",
            topSpeed: "32mph (51km/h)",
            weight: "73lbs (33kg)",
            range: "35-50 miles",
            price: "$2,199-2,499",
            availability: "US market",
            suspension: "Front suspension",
            brakes: "Hydraulic disc",
            tires: "20x4.0 fat tires",
            notes: "Moped style e-bike"
          }
        ]
      }
    ]
  },

  // TANTAN MOTOR (China Alibaba high-power)
  "Tantan Motor": {
    country: "China",
    website: "https://tantanmotor.en.alibaba.com",
    founded: 2018,
    headquarters: "Wuxi, Jiangsu, China",
    focus: "High-power hub motor e-bikes for wholesale",
    models: [
      {
        model: "TT8000",
        variants: [
          {
            name: "TT8000 Dual Motor",
            motor: "8000W dual hub motors (4000W each)",
            battery: "72V 40Ah lithium",
            topSpeed: "65mph (105km/h)",
            weight: "95lbs (43kg)",
            range: "50-80 miles",
            price: "$2,200 (MOQ 5 units)",
            availability: "Alibaba wholesale only",
            suspension: "Full suspension",
            brakes: "Hydraulic disc 200mm",
            frame: "Steel fat bike frame",
            tires: "26\" x 4\" knobby",
            notes: "Extreme power, wholesale only"
          }
        ]
      },
      {
        model: "TT5000",
        variants: [
          {
            name: "TT5000 Mountain",
            motor: "5000W rear hub motor",
            battery: "72V 32Ah",
            topSpeed: "55mph (88km/h)",
            weight: "85lbs (38.5kg)",
            range: "60-100 miles",
            price: "$1,800 (MOQ 2 units)",
            availability: "Alibaba wholesale",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Aluminum mountain",
            notes: "High-power single motor"
          }
        ]
      }
    ]
  },

  // HONGDU EBIKE (China Alibaba popular)
  "Hongdu eBike": {
    country: "China",
    website: "https://hongdu-ebike.en.alibaba.com",
    founded: 2016,
    headquarters: "Tianjin, China",
    focus: "Popular Alibaba fat tire e-bikes",
    models: [
      {
        model: "HD3000",
        variants: [
          {
            name: "HD3000 Beach Cruiser",
            motor: "3000W rear hub motor",
            battery: "60V 35Ah lithium",
            topSpeed: "45mph (72km/h)",
            weight: "82lbs (37kg)",
            range: "70-100 miles",
            price: "$1,200 (MOQ 1 unit)",
            availability: "Alibaba direct shipping",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc 180mm",
            frame: "Aluminum beach cruiser",
            tires: "26\" x 4.5\" beach tires",
            notes: "Very popular Alibaba model"
          }
        ]
      },
      {
        model: "HD2000",
        variants: [
          {
            name: "HD2000 City",
            motor: "2000W rear hub",
            battery: "48V 20Ah",
            topSpeed: "38mph",
            weight: "70lbs",
            range: "50-70 miles",
            price: "$950 (MOQ 1)",
            availability: "Alibaba",
            suspension: "Front fork",
            brakes: "Hydraulic disc",
            frame: "Aluminum",
            notes: "Budget high-power option"
          }
        ]
      }
    ]
  },

  // QS MOTOR (China conversion specialist)
  "QS Motor": {
    country: "China",
    website: "https://qsmotor.com",
    founded: 2008,
    headquarters: "Changzhou, Jiangsu, China",
    focus: "High-power hub motor conversion kits",
    models: [
      {
        model: "QS273",
        variants: [
          {
            name: "QS273 10kW Hub Motor",
            motor: "10000W hub motor conversion kit",
            battery: "72V-96V compatible (not included)",
            topSpeed: "80mph+ (depends on voltage/gearing)",
            weight: "Motor: 35lbs (16kg)",
            range: "Depends on battery configuration",
            price: "$899 (motor kit only)",
            availability: "In stock globally",
            type: "Conversion kit - motor only",
            brakes: "Customer supplies",
            frame: "Customer supplies",
            notes: "Extreme power conversion, racing use"
          }
        ]
      },
      {
        model: "QS138",
        variants: [
          {
            name: "QS138 5kW Hub Motor",
            motor: "5000W hub motor conversion kit",
            battery: "72V compatible (not included)",
            topSpeed: "60mph (depends on setup)",
            weight: "Motor: 28lbs (13kg)",
            range: "Depends on battery",
            price: "$599 (motor kit only)",
            availability: "In stock",
            type: "Conversion kit",
            notes: "Popular high-power conversion"
          }
        ]
      }
    ]
  },

  // BOMBA ELECTRIC (Poland premium)
  "Bomba Electric": {
    country: "Poland",
    website: "https://bombaelectric.pl",
    founded: 2020,
    headquarters: "Warsaw, Poland",
    focus: "Premium high-performance European e-bikes",
    models: [
      {
        model: "Bomba Beast",
        variants: [
          {
            name: "Beast 5000",
            motor: "5000W Bafang Ultra (modified)",
            battery: "72V 30Ah Samsung cells",
            topSpeed: "60mph (96km/h)",
            weight: "68lbs (31kg)",
            range: "80-120 miles",
            price: "€4,999",
            availability: "Made to order (6-8 weeks)",
            suspension: "Fox Factory 36 / Fox DPX2",
            brakes: "Magura MT7 4-piston",
            frame: "Custom aluminum 6061",
            notes: "Premium European engineering"
          }
        ]
      },
      {
        model: "Bomba Urban",
        variants: [
          {
            name: "Urban 3000",
            motor: "3000W mid-drive",
            battery: "60V 25Ah",
            topSpeed: "45mph",
            weight: "58lbs",
            range: "60-90 miles",
            price: "€3,499",
            availability: "Made to order",
            suspension: "Front suspension",
            brakes: "Shimano XT hydraulic",
            frame: "Aluminum urban",
            notes: "Urban commuter focus"
          }
        ]
      }
    ]
  },

  // FLASH EBIKE (Slovenia handmade)
  "Flash eBike": {
    country: "Slovenia",
    website: "https://flashebike.si",
    founded: 2019,
    headquarters: "Ljubljana, Slovenia",
    focus: "Handmade high-performance e-bikes",
    models: [
      {
        model: "Flash Thunder",
        variants: [
          {
            name: "Thunder 4000",
            motor: "4000W custom mid-drive",
            battery: "72V 25Ah custom pack",
            topSpeed: "55mph (88km/h)",
            weight: "65lbs (29.5kg)",
            range: "60-90 miles",
            price: "€4,299",
            availability: "Custom build (8-12 weeks)",
            suspension: "Fox Racing Shox custom",
            brakes: "Hope Tech 4 V4 203mm",
            frame: "Custom chromoly steel",
            notes: "Completely handmade in Slovenia"
          }
        ]
      }
    ]
  },

  // MUSTANG ELECTRIC BIKES (Turkey)
  "Mustang Electric Bikes": {
    country: "Turkey",
    website: "https://mustangelectric.com.tr",
    founded: 2021,
    headquarters: "Istanbul, Turkey",
    focus: "Premium e-bikes for Middle East market",
    models: [
      {
        model: "Mustang Wild",
        variants: [
          {
            name: "Wild 5000",
            motor: "5000W rear hub motor",
            battery: "72V 28Ah lithium",
            topSpeed: "58mph (93km/h)",
            weight: "78lbs (35kg)",
            range: "70-100 miles",
            price: "₺85,000 (~$3,200)",
            availability: "Middle East dealers",
            suspension: "Full suspension",
            brakes: "Brembo hydraulic 4-piston",
            frame: "Aluminum 7005",
            notes: "Designed for Middle East conditions"
          }
        ]
      }
    ]
  },

  // OPAI ELECTRIC (Indonesia)
  "Opai Electric": {
    country: "Indonesia",
    website: "https://opaielectric.co.id",
    founded: 2020,
    headquarters: "Jakarta, Indonesia",
    focus: "Adventure e-bikes for Indonesian terrain",
    models: [
      {
        model: "Opai Adventure",
        variants: [
          {
            name: "Adventure 2000",
            motor: "2000W Bafang mid-drive",
            battery: "60V 20Ah lithium",
            topSpeed: "40mph (64km/h)",
            weight: "72lbs (33kg)",
            range: "50-80 miles",
            price: "IDR 25,000,000 (~$1,650)",
            availability: "Indonesia local dealers",
            suspension: "Full suspension 140mm",
            brakes: "Hydraulic disc 180mm",
            frame: "Steel adventure frame",
            notes: "Built for tropical conditions"
          }
        ]
      }
    ]
  },

  // VOLTBIKE THAILAND (Thailand)
  "Voltbike Thailand": {
    country: "Thailand",
    website: "https://voltbike.co.th",
    founded: 2021,
    headquarters: "Bangkok, Thailand",
    focus: "High-power enduro e-bikes",
    models: [
      {
        model: "Volt Enduro",
        variants: [
          {
            name: "Enduro 3500",
            motor: "3500W Bafang Ultra",
            battery: "72V 20Ah Samsung",
            topSpeed: "48mph (77km/h)",
            weight: "70lbs (32kg)",
            range: "45-70 miles",
            price: "฿120,000 (~$3,300)",
            availability: "Thailand only",
            suspension: "Full suspension 150mm",
            brakes: "Shimano XT hydraulic",
            frame: "Aluminum enduro geometry",
            notes: "Thai-assembled, regional focus"
          }
        ]
      }
    ]
  },

  // VECTOR EBIKES (India premium)
  "Vector eBikes": {
    country: "India",
    website: "https://vectorebikes.in",
    founded: 2022,
    headquarters: "Bangalore, India",
    focus: "Premium e-bikes for Indian market",
    models: [
      {
        model: "Vector X3",
        variants: [
          {
            name: "X3 Power",
            motor: "3000W BLDC hub motor",
            battery: "60V 30Ah lithium",
            topSpeed: "45mph (72km/h)",
            weight: "75lbs (34kg)",
            range: "80-120 miles",
            price: "₹2,50,000 (~$3,000)",
            availability: "Indian market only",
            suspension: "Front suspension 100mm",
            brakes: "Hydraulic disc 180mm",
            frame: "Steel reinforced",
            notes: "Designed for Indian road conditions"
          }
        ]
      }
    ]
  },

  // E-MOTO BRASIL (Brazil)
  "E-Moto Brasil": {
    country: "Brazil",
    website: "https://emotobrasil.com.br",
    founded: 2020,
    headquarters: "São Paulo, Brazil",
    focus: "High-power e-bikes for Brazilian market",
    models: [
      {
        model: "Voltz EV1",
        variants: [
          {
            name: "Voltz EV1",
            motor: "3000W rear hub motor",
            battery: "60V 25Ah lithium",
            topSpeed: "50mph (80km/h)",
            weight: "80lbs (36kg)",
            range: "60-90 miles",
            price: "R$ 12,500 (~$2,400)",
            availability: "Brazil market only",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Steel moped style",
            notes: "Very popular in Brazilian market"
          }
        ]
      }
    ]
  },

  // ECORIDE MEXICO (Mexico)
  "EcoRide Mexico": {
    country: "Mexico",
    website: "https://ecoridemx.com",
    founded: 2021,
    headquarters: "Mexico City, Mexico",
    focus: "Central American market e-bikes",
    models: [
      {
        model: "Azteca",
        variants: [
          {
            name: "Azteca 2500",
            motor: "2500W rear hub motor",
            battery: "60V 20Ah lithium",
            topSpeed: "42mph (67km/h)",
            weight: "76lbs (34.5kg)",
            range: "50-75 miles",
            price: "$35,000 MXN (~$1,950)",
            availability: "Mexico/Central America",
            suspension: "Front fork 80mm",
            brakes: "Hydraulic disc",
            frame: "Steel beach cruiser style",
            notes: "Regional design for Mexican market"
          }
        ]
      }
    ]
  },

  // ETRIX AFRICA (South Africa)
  "Etrix Africa": {
    country: "South Africa",
    website: "https://etrixafrica.co.za",
    founded: 2021,
    headquarters: "Cape Town, South Africa",
    focus: "E-bikes designed for African terrain",
    models: [
      {
        model: "Bush Rider",
        variants: [
          {
            name: "Bush Rider 3000",
            motor: "3000W rear hub motor",
            battery: "60V 25Ah lithium",
            topSpeed: "45mph (72km/h)",
            weight: "78lbs (35kg)",
            range: "60-80 miles",
            price: "R 45,000 (~$2,500)",
            availability: "Southern Africa",
            suspension: "Heavy-duty front fork 100mm",
            brakes: "Hydraulic disc 203mm",
            frame: "Reinforced steel frame",
            notes: "Specifically built for African conditions"
          }
        ]
      }
    ]
  },

  // CYCLONE MOTOR (Taiwan conversion)
  "Cyclone Motor": {
    country: "Taiwan/China",
    website: "https://cyclone-tw.com",
    founded: 2012,
    headquarters: "Taichung, Taiwan",
    focus: "High-power mid-drive conversion kits",
    models: [
      {
        model: "Cyclone 3000W",
        variants: [
          {
            name: "Cyclone 3000W Mid-Drive Kit",
            motor: "3000W mid-drive conversion motor",
            battery: "Customer choice (not included)",
            topSpeed: "50mph (depends on gearing)",
            weight: "Conversion kit: 25lbs (11kg)",
            range: "Depends on battery selection",
            price: "$899 (conversion kit only)",
            availability: "Global shipping",
            type: "Mid-drive conversion kit",
            notes: "Very popular DIY conversion option"
          }
        ]
      },
      {
        model: "Cyclone 6000W",
        variants: [
          {
            name: "Cyclone 6000W Mid-Drive Kit",
            motor: "6000W mid-drive conversion",
            battery: "Customer choice (not included)",
            topSpeed: "70mph (depends on gearing)",
            weight: "Conversion kit: 32lbs (14.5kg)",
            range: "Depends on battery",
            price: "$1,299 (kit only)",
            availability: "In stock",
            type: "Extreme power mid-drive kit",
            notes: "For experienced builders only"
          }
        ]
      }
    ]
  },

  // CUSTOM CRUISERS CO (USA custom)
  "Custom Cruisers Co": {
    country: "USA",
    website: "https://customcruisersco.com",
    founded: 2019,
    headquarters: "San Diego, California, USA",
    focus: "Custom chopper-style e-bikes",
    models: [
      {
        model: "Beach Chopper",
        variants: [
          {
            name: "Beach Chopper 3000",
            motor: "3000W rear hub (custom wound)",
            battery: "72V 20Ah custom pack",
            topSpeed: "45mph (72km/h)",
            weight: "85lbs (38.5kg)",
            range: "40-60 miles",
            price: "$4,999",
            availability: "Custom build (6-12 weeks)",
            suspension: "Springer front fork",
            brakes: "Hydraulic disc custom",
            frame: "Custom steel chopper frame",
            notes: "California chopper style, fully custom"
          }
        ]
      }
    ]
  },

  // KRANKED EBIKES (Australia)
  "Kranked eBikes": {
    country: "Australia",
    website: "https://krankedebikes.com.au",
    founded: 2020,
    headquarters: "Melbourne, Australia",
    focus: "E-bikes for Australian outback conditions",
    models: [
      {
        model: "Outback Beast",
        variants: [
          {
            name: "Outback Beast 4000",
            motor: "4000W Bafang Ultra (modified)",
            battery: "72V 25Ah Samsung",
            topSpeed: "52mph (83km/h)",
            weight: "72lbs (33kg)",
            range: "60-90 miles",
            price: "AUD $5,999 (~$4,000)",
            availability: "Australia/New Zealand only",
            suspension: "Full suspension 140mm",
            brakes: "Shimano XT hydraulic",
            frame: "Aluminum 6061",
            notes: "Engineered for Australian outback"
          }
        ]
      }
    ]
  },

  // ZUGO BIKE (USA moped style)
  "Zugo Bike": {
    country: "USA",
    website: "https://zugobike.com",
    founded: 2020,
    headquarters: "Irvine, California, USA",
    focus: "Moped-style e-bikes with pedals",
    models: [
      {
        model: "Rhino",
        variants: [
          {
            name: "Rhino",
            motor: "1200W peak / 750W nominal hub",
            battery: "48V 16Ah removable Samsung",
            topSpeed: "28mph (45km/h)",
            weight: "68lbs (31kg)",
            range: "35-50 miles",
            price: "$1,999",
            availability: "In stock USA",
            suspension: "Front suspension fork",
            brakes: "Hydraulic disc",
            frame: "Aluminum moped style with pedals",
            notes: "Moped styling but legally an e-bike"
          }
        ]
      }
    ]
  }
};

// Helper functions
function getAllBrands() {
  return Object.keys(offRoadElectricBrands);
}

function getBrandModels(brandName) {
  const brand = offRoadElectricBrands[brandName];
  if (!brand) return [];
  return brand.models.map(m => m.model);
}

function getAllModelsAndVariants() {
  const result = [];
  for (const [brandName, brand] of Object.entries(offRoadElectricBrands)) {
    for (const model of brand.models) {
      for (const variant of model.variants) {
        result.push({
          brand: brandName,
          model: model.model,
          variant: variant.name,
          specs: variant
        });
      }
    }
  }
  return result;
}

function searchBySpecs(criteria) {
  // Example: searchBySpecs({ minPower: 3000, maxPrice: 5000 })
  const results = getAllModelsAndVariants();
  
  if (criteria.minPower) {
    const minWatts = parseInt(criteria.minPower);
    return results.filter(bike => {
      const power = parseInt(bike.specs.motor);
      return power >= minWatts;
    });
  }
  
  return results;
}

function getDatabaseStatistics() {
  const brands = Object.keys(offRoadElectricBrands);
  const allVariants = getAllModelsAndVariants();
  
  // Count by country
  const countryStats = {};
  for (const [brandName, brand] of Object.entries(offRoadElectricBrands)) {
    const country = brand.country;
    countryStats[country] = (countryStats[country] || 0) + 1;
  }
  
  // Count by power range
  const powerRanges = {
    'under750W': 0,
    '750W-1500W': 0, 
    '1500W-3000W': 0,
    '3000W-5000W': 0,
    'over5000W': 0
  };
  
  allVariants.forEach(variant => {
    const powerMatch = variant.specs.motor?.match(/(\d+)W/);
    if (powerMatch) {
      const watts = parseInt(powerMatch[1]);
      if (watts < 750) powerRanges['under750W']++;
      else if (watts <= 1500) powerRanges['750W-1500W']++;
      else if (watts <= 3000) powerRanges['1500W-3000W']++;
      else if (watts <= 5000) powerRanges['3000W-5000W']++;
      else powerRanges['over5000W']++;
    }
  });
  
  // Count by price range
  const priceRanges = {
    'under1000': 0,
    '1000-2000': 0,
    '2000-4000': 0,
    '4000-6000': 0,
    'over6000': 0
  };
  
  allVariants.forEach(variant => {
    const priceText = variant.specs.price;
    if (priceText) {
      const priceMatch = priceText.match(/\$(\d+)/);
      if (priceMatch) {
        const price = parseInt(priceMatch[1]);
        if (price < 1000) priceRanges['under1000']++;
        else if (price < 2000) priceRanges['1000-2000']++;
        else if (price < 4000) priceRanges['2000-4000']++;
        else if (price < 6000) priceRanges['4000-6000']++;
        else priceRanges['over6000']++;
      }
    }
  });
  
  // Count by availability status
  const availabilityStats = {};
  allVariants.forEach(variant => {
    const status = variant.specs.availability || 'Unknown';
    availabilityStats[status] = (availabilityStats[status] || 0) + 1;
  });
  
  // Count models per brand
  const modelsPerBrand = {};
  for (const [brandName, brand] of Object.entries(offRoadElectricBrands)) {
    let totalModels = 0;
    brand.models.forEach(model => {
      totalModels += model.variants.length;
    });
    modelsPerBrand[brandName] = totalModels;
  }
  
  return {
    summary: {
      totalBrands: brands.length,
      totalModels: allVariants.length,
      lastUpdated: new Date().toISOString()
    },
    countryBreakdown: countryStats,
    powerRangeBreakdown: powerRanges,
    priceRangeBreakdown: priceRanges,
    availabilityBreakdown: availabilityStats,
    topBrandsByModels: Object.entries(modelsPerBrand)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([brand, count]) => ({ brand, modelCount: count }))
  };
}

function generateDatabaseReport() {
  const stats = getDatabaseStatistics();
  
  let report = `
# Gray Area E-Bike Database Report

## Summary
- **Total Brands**: ${stats.summary.totalBrands}
- **Total Models/Variants**: ${stats.summary.totalModels}
- **Last Updated**: ${stats.summary.lastUpdated}

## Geographic Distribution
`;

  Object.entries(stats.countryBreakdown).forEach(([country, count]) => {
    report += `- **${country}**: ${count} brands\n`;
  });

  report += `
## Power Range Distribution
`;
  Object.entries(stats.powerRangeBreakdown).forEach(([range, count]) => {
    report += `- **${range}**: ${count} models\n`;
  });

  report += `
## Price Range Distribution
`;
  Object.entries(stats.priceRangeBreakdown).forEach(([range, count]) => {
    report += `- **${range}**: ${count} models\n`;
  });

  report += `
## Availability Status
`;
  Object.entries(stats.availabilityBreakdown).forEach(([status, count]) => {
    report += `- **${status}**: ${count} models\n`;
  });

  report += `
## Top Brands by Model Count
`;
  stats.topBrandsByModels.forEach(({ brand, modelCount }) => {
    report += `- **${brand}**: ${modelCount} models\n`;
  });

  return report;
}

module.exports = {
  offRoadElectricBrands,
  getAllBrands,
  getBrandModels,
  getAllModelsAndVariants,
  searchBySpecs,
  getDatabaseStatistics,
  generateDatabaseReport
};