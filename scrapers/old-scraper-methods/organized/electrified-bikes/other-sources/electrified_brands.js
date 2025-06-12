// Electrified Bike Brands Database
// These are electric bikes that fall into the "gray area" between bicycles and motorcycles
// Often called e-bikes, electric dirt bikes, or light electric motorcycles

const electrifiedBrands = [
  {
    id: 1,
    name: "Segway",
    logo: "/logos/electrified-brands/segway.png",
    website: "https://www.segway.com",
    headquarters: "Bedford, NH, USA",
    founded: 1999,
    category: "multi-category",
    description: "Known for personal transporters, now produces electric bikes and scooters",
    popularModels: ["X160", "X260", "Dirt eBike"]
  },
  {
    id: 2,
    name: "Rawrr",
    logo: "/logos/electrified-brands/rawrr.png",
    website: "https://rawrrmoto.com",
    headquarters: "USA",
    founded: 2020,
    category: "performance",
    description: "High-performance electric motorcycles and e-bikes",
    popularModels: ["Mantis", "Mantis X"]
  },
  {
    id: 3,
    name: "E-Ride Pro",
    logo: "/logos/electrified-brands/e-ride-pro.png",
    website: "https://eridepro.com",
    headquarters: "USA",
    founded: 2018,
    category: "off-road",
    description: "Specializes in electric dirt bikes and off-road vehicles",
    popularModels: ["SR-72", "SR-48"]
  },
  {
    id: 4,
    name: "Stage 2 (Razor)",
    logo: "/logos/electrified-brands/razor.png",
    website: "https://razor.com",
    headquarters: "Cerritos, CA, USA",
    founded: 2000,
    category: "entry-level",
    description: "Electric scooters and entry-level electric bikes",
    popularModels: ["MX650", "RSF650", "SX500"]
  },
  {
    id: 5,
    name: "79Bike",
    logo: "/logos/electrified-brands/79bike.png",
    website: "https://79bike.com",
    headquarters: "USA",
    founded: 2019,
    category: "urban",
    description: "Urban electric bikes with vintage styling",
    popularModels: ["79 Classic", "79 Sport"]
  },
  {
    id: 6,
    name: "Arctic Leopard",
    logo: "/logos/electrified-brands/arctic-leopard.png",
    website: "https://arcticleopard.com",
    headquarters: "China",
    founded: 2018,
    category: "budget",
    description: "Affordable electric bikes and scooters",
    popularModels: ["AL-1000", "AL-2000"]
  },
  {
    id: 7,
    name: "Ventus",
    logo: "/logos/electrified-brands/ventus.png",
    website: "https://ventusmoto.com",
    headquarters: "USA",
    founded: 2020,
    category: "performance",
    description: "High-performance electric motorcycles",
    popularModels: ["V1", "V2"]
  },
  {
    id: 8,
    name: "Altis",
    logo: "/logos/electrified-brands/altis.png",
    website: "https://altismotion.com",
    headquarters: "USA",
    founded: 2019,
    category: "urban",
    description: "Electric bikes for urban commuting",
    popularModels: ["Altis Sigma", "Altis Delta"]
  },
  {
    id: 9,
    name: "Flux Performance",
    logo: "/logos/electrified-brands/flux.png",
    website: "https://fluxmoto.com",
    headquarters: "Slovenia",
    founded: 2016,
    category: "performance",
    description: "High-performance electric motorcycles and supermoto bikes",
    popularModels: ["Flux Primo", "Flux MX"]
  },
  {
    id: 10,
    name: "Cake",
    logo: "/logos/electrified-brands/cake.png",
    website: "https://ridecake.com",
    headquarters: "Stockholm, Sweden",
    founded: 2016,
    category: "premium",
    description: "Premium lightweight electric motorcycles",
    popularModels: ["Kalk OR", "Kalk&", "Osa+"]
  },
  {
    id: 11,
    name: "Kuberg",
    logo: "/logos/electrified-brands/kuberg.png",
    website: "https://kuberg.com",
    headquarters: "Czech Republic",
    founded: 2009,
    category: "youth",
    description: "Electric motorcycles for youth and adults",
    popularModels: ["Free-Rider", "Ranger", "Challenger"]
  },
  {
    id: 12,
    name: "Bultaco",
    logo: "/logos/electrified-brands/bultaco.png",
    website: "https://bultaco.com",
    headquarters: "Barcelona, Spain",
    founded: 1958,
    category: "heritage",
    description: "Historic motorcycle brand revived with electric models",
    popularModels: ["Brinco", "Albero"]
  },
  {
    id: 13,
    name: "Electric Motion",
    logo: "/logos/electrified-brands/electric-motion.png",
    website: "https://electric-motion.fr",
    headquarters: "Castres, France",
    founded: 2009,
    category: "trials",
    description: "Electric trials motorcycles",
    popularModels: ["Escape", "Epure", "Etrek"]
  },
  {
    id: 14,
    name: "Zero Motorcycles",
    logo: "/logos/electrified-brands/zero.png",
    website: "https://zeromotorcycles.com",
    headquarters: "Scotts Valley, CA, USA",
    founded: 2006,
    category: "premium",
    description: "Leading manufacturer of electric motorcycles",
    popularModels: ["SR/F", "DSR/X", "FXE"]
  },
  {
    id: 15,
    name: "KTM",
    logo: "/logos/electrified-brands/ktm.png",
    website: "https://ktm.com",
    headquarters: "Mattighofen, Austria",
    founded: 1934,
    category: "major-brand",
    description: "Major motorcycle manufacturer with electric models",
    popularModels: ["Freeride E-XC", "SX-E 5"]
  },
  {
    id: 16,
    name: "Drill One (CZEM)",
    logo: "/logos/electrified-brands/drill-one.png",
    website: "https://czem.cz",
    headquarters: "Czech Republic",
    founded: 2015,
    category: "performance",
    description: "Electric enduro motorcycles",
    popularModels: ["Drill One EVO", "Drill One Cross"]
  },
  {
    id: 17,
    name: "Qulbix",
    logo: "/logos/electrified-brands/qulbix.png",
    website: "https://qulbix.com",
    headquarters: "Slovenia",
    founded: 2014,
    category: "off-road",
    description: "Electric mountain bikes and light motorcycles",
    popularModels: ["Q76R", "Q140MD", "Raptor"]
  },
  {
    id: 18,
    name: "Stealth Electric Bikes",
    logo: "/logos/electrified-brands/stealth.png",
    website: "https://stealthelectricbikes.com",
    headquarters: "Melbourne, Australia",
    founded: 2010,
    category: "performance",
    description: "High-performance electric bikes",
    popularModels: ["B-52", "H-52", "F-37"]
  },
  {
    id: 19,
    name: "Delfast",
    logo: "/logos/electrified-brands/delfast.png",
    website: "https://delfastbikes.com",
    headquarters: "Kyiv, Ukraine",
    founded: 2014,
    category: "long-range",
    description: "Electric bikes with exceptional range",
    popularModels: ["Top 3.0", "Top 3.0i", "Partner"]
  },
  {
    id: 20,
    name: "ONYX",
    logo: "/logos/electrified-brands/onyx.png",
    website: "https://onyxmotorbikes.com",
    headquarters: "San Francisco, CA, USA",
    founded: 2016,
    category: "retro",
    description: "Retro-styled electric mopeds and motorcycles",
    popularModels: ["RCR", "CTY2", "LZR"]
  },
  {
    id: 21,
    name: "Monday Motorbikes",
    logo: "/logos/electrified-brands/monday.png",
    website: "https://mondaymotorbikes.com",
    headquarters: "San Francisco, CA, USA",
    founded: 2019,
    category: "urban",
    description: "Electric motorcycles for urban commuting",
    popularModels: ["Gateway", "Presidio", "Anza"]
  },
  {
    id: 22,
    name: "Volcon",
    logo: "/logos/electrified-brands/volcon.png",
    website: "https://volcon.com",
    headquarters: "Austin, TX, USA",
    founded: 2020,
    category: "off-road",
    description: "Electric off-road vehicles and motorcycles",
    popularModels: ["Grunt", "Runt", "Brat"]
  },
  {
    id: 23,
    name: "HappyRun",
    logo: "/logos/electrified-brands/happyrun.png",
    website: "https://happyrunebike.com",
    headquarters: "USA",
    founded: 2018,
    category: "budget",
    description: "Affordable electric bikes for various uses",
    popularModels: ["G60", "Tank G60", "G50"]
  },
  {
    id: 24,
    name: "Alta Motors",
    logo: "/logos/electrified-brands/alta.png",
    website: "https://altamotors.co",
    headquarters: "Brisbane, CA, USA",
    founded: 2010,
    category: "performance",
    description: "High-performance electric dirt bikes (ceased operations 2018)",
    popularModels: ["Redshift MX", "Redshift EX", "Redshift SM"],
    status: "defunct"
  }
];

// Additional brands not in the original list but important in the electrified space
const additionalElectrifiedBrands = [
  {
    id: 25,
    name: "Sur-Ron",
    logo: "/logos/electrified-brands/sur-ron.png",
    website: "https://sur-ron.com",
    headquarters: "China",
    founded: 2014,
    category: "off-road",
    description: "Popular electric dirt bikes and light motorcycles",
    popularModels: ["Light Bee X", "Storm Bee", "Ultra Bee"]
  },
  {
    id: 26,
    name: "Talaria",
    logo: "/logos/electrified-brands/talaria.png",
    website: "https://talaria.bike",
    headquarters: "China",
    founded: 2019,
    category: "off-road",
    description: "Electric dirt bikes similar to Sur-Ron",
    popularModels: ["Sting", "Sting R MX4", "XXX"]
  },
  {
    id: 27,
    name: "Super73",
    logo: "/logos/electrified-brands/super73.png",
    website: "https://super73.com",
    headquarters: "Irvine, CA, USA",
    founded: 2016,
    category: "retro",
    description: "Retro-styled electric bikes",
    popularModels: ["S2", "RX", "ZX"]
  },
  {
    id: 28,
    name: "Stark Future",
    logo: "/logos/electrified-brands/stark.png",
    website: "https://starkfuture.com",
    headquarters: "Barcelona, Spain",
    founded: 2019,
    category: "performance",
    description: "High-performance electric motocross bikes",
    popularModels: ["Stark VARG", "Stark VARG EX"]
  }
];

// Categories for electrified bikes
const electrifiedCategories = {
  "off-road": "Off-road and dirt bikes",
  "urban": "Urban commuters and city bikes",
  "performance": "High-performance models",
  "retro": "Retro-styled bikes",
  "premium": "Premium/luxury brands",
  "budget": "Budget-friendly options",
  "youth": "Youth and smaller riders",
  "long-range": "Extended range models",
  "multi-category": "Multiple bike types",
  "trials": "Trials motorcycles",
  "heritage": "Historic brands gone electric",
  "major-brand": "Major manufacturers with electric lines",
  "entry-level": "Entry-level and beginner bikes"
};

// Power classes for electrified bikes
const powerClasses = {
  "class-1": {
    name: "Class 1 E-bike",
    description: "Pedal assist only, up to 20 mph",
    maxPower: "750W",
    license: "No license required"
  },
  "class-2": {
    name: "Class 2 E-bike",
    description: "Throttle and pedal assist, up to 20 mph",
    maxPower: "750W",
    license: "No license required"
  },
  "class-3": {
    name: "Class 3 E-bike",
    description: "Pedal assist only, up to 28 mph",
    maxPower: "750W",
    license: "No license required in most areas"
  },
  "light-electric": {
    name: "Light Electric Motorcycle",
    description: "More powerful than e-bikes, less than full motorcycles",
    maxPower: "5kW",
    license: "May require license/registration"
  },
  "electric-motorcycle": {
    name: "Electric Motorcycle",
    description: "Full electric motorcycles",
    maxPower: "11kW+",
    license: "Motorcycle license required"
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    electrifiedBrands: [...electrifiedBrands, ...additionalElectrifiedBrands],
    electrifiedCategories,
    powerClasses
  };
}