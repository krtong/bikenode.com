// Data sources for gray area e-bikes
// This file contains URLs and selectors for scraping various sources

const dataSources = {
  // MANUFACTURER WEBSITES
  manufacturers: [
    {
      name: "Sur-Ron",
      urls: [
        "https://sur-ronusa.com/collections/all",
        "https://sur-ron.com/products/"
      ],
      selectors: {
        products: ".product-item",
        name: ".product-item__title",
        price: ".price",
        specs: ".product__description li"
      }
    },
    {
      name: "Talaria",
      urls: [
        "https://talaria.bike/pages/bikes",
        "https://www.talaria-sting.com/models"
      ]
    },
    {
      name: "Segway",
      urls: [
        "https://powersports.segway.com/off-road/",
        "https://store.segway.com/dirt-ebike"
      ]
    },
    {
      name: "Cake",
      urls: [
        "https://ridecake.com/models",
        "https://ridecake.com/en-US/models"
      ]
    },
    {
      name: "Stealth Electric Bikes",
      urls: [
        "https://www.stealthelectricbikes.com/product-category/electric-bikes/"
      ]
    },
    {
      name: "Onyx Motorbikes",
      urls: [
        "https://onyxmotorbikes.com/collections/bikes"
      ]
    },
    {
      name: "Monday Motorbikes",
      urls: [
        "https://mondaymotorbikes.com/collections/bikes"
      ]
    },
    {
      name: "Super73",
      urls: [
        "https://super73.com/collections/bikes"
      ]
    },
    {
      name: "Ariel Rider",
      urls: [
        "https://arielrider.com/collections/electric-bikes"
      ]
    },
    {
      name: "Juiced Bikes",
      urls: [
        "https://www.juicedbikes.com/collections/e-bikes"
      ]
    }
  ],

  // RETAILER WEBSITES
  retailers: [
    {
      name: "Luna Cycle",
      url: "https://lunacycle.com/electric-bikes/",
      categories: ["high-power", "sur-ron", "talaria"]
    },
    {
      name: "Grin Technologies",
      url: "https://ebikes.ca/shop/electric-bicycles.html"
    },
    {
      name: "Electric Bike Company",
      url: "https://electricbikecompany.com/collections/electric-bikes"
    },
    {
      name: "Bikes Xpress",
      url: "https://bikes-xpress.com/collections/electric-bikes"
    },
    {
      name: "Alien Rides",
      url: "https://alienrides.com/collections/electric-bikes"
    },
    {
      name: "E-CELLS",
      url: "https://www.e-cells.com/electric-bikes/"
    }
  ],

  // REVIEW & NEWS SITES
  reviewSites: [
    {
      name: "Electric Bike Review",
      url: "https://electricbikereview.com/",
      categories: [
        "https://electricbikereview.com/category/high-speed/",
        "https://electricbikereview.com/category/moped-style/",
        "https://electricbikereview.com/category/off-road/"
      ]
    },
    {
      name: "Electrek",
      url: "https://electrek.co/guides/electric-bicycle/"
    },
    {
      name: "ElectricBike.com",
      url: "https://www.electricbike.com/category/ebike-news/"
    },
    {
      name: "eBike Choices",
      url: "https://ebikechoices.com/electric-bike-reviews/"
    },
    {
      name: "The Verge E-Bikes",
      url: "https://www.theverge.com/electric-bikes"
    },
    {
      name: "BikeRadar Electric",
      url: "https://www.bikeradar.com/advice/buyers-guides/best-electric-bikes/"
    }
  ],

  // FORUMS & COMMUNITIES
  forums: [
    {
      name: "Endless Sphere",
      url: "https://endless-sphere.com/forums/",
      sections: [
        "viewforum.php?f=28", // E-bike Technical
        "viewforum.php?f=2",  // E-bike General Discussion
        "viewforum.php?f=3"   // E-bike Kits
      ]
    },
    {
      name: "Electric Bike Forum",
      url: "https://www.electricbikeforum.com/"
    },
    {
      name: "Reddit r/ebikes",
      url: "https://www.reddit.com/r/ebikes/"
    },
    {
      name: "Reddit r/Surron",
      url: "https://www.reddit.com/r/Surron/"
    },
    {
      name: "Reddit r/Super73",
      url: "https://www.reddit.com/r/Super73/"
    },
    {
      name: "PedelecForum (German)",
      url: "https://www.pedelecforum.de/"
    }
  ],

  // INDUSTRY DATABASES & DIRECTORIES
  databases: [
    {
      name: "ExtraEnergy Test Database",
      url: "http://www.extraenergy.org/main.php?language=en&category=information&subcateg=4&id=2541"
    },
    {
      name: "LEVA (Light Electric Vehicle Association)",
      url: "https://levassociation.com/members/"
    },
    {
      name: "Bike Europe Industry Directory",
      url: "https://www.bike-eu.com/industry-directory"
    }
  ],

  // CHINESE MANUFACTURER SITES
  chineseManufacturers: [
    {
      name: "Alibaba E-Bikes",
      url: "https://www.alibaba.com/trade/search?SearchText=electric%20bike%205000w"
    },
    {
      name: "Made-in-China E-Bikes",
      url: "https://www.made-in-china.com/products-search/hot-china-products/Electric_Bike.html"
    },
    {
      name: "DHgate High Power E-Bikes",
      url: "https://www.dhgate.com/wholesale/high+power+electric+bike.html"
    }
  ],

  // SPECIALTY SITES FOR GRAY AREA BIKES
  specialtySites: [
    {
      name: "Sur-Ron Forum",
      url: "https://sur-ronforum.com/"
    },
    {
      name: "Talaria Owners Group",
      url: "https://www.facebook.com/groups/talaria"
    },
    {
      name: "High Power E-Bike Group",
      url: "https://www.facebook.com/groups/highpowerebikes"
    }
  ]
};

// Scraping patterns for common e-bike specs
const specPatterns = {
  motor: [
    /motor:?\s*(\d+)\s*w/i,
    /(\d+)\s*watt/i,
    /(\d+)w\s*motor/i,
    /power:?\s*(\d+)\s*w/i
  ],
  battery: [
    /battery:?\s*(\d+v\s*\d+ah)/i,
    /(\d+)v\s*(\d+)ah/i,
    /(\d+)\s*volt.*?(\d+)\s*ah/i
  ],
  topSpeed: [
    /top speed:?\s*(\d+)\s*mph/i,
    /max speed:?\s*(\d+)\s*mph/i,
    /(\d+)\s*mph\s*top speed/i,
    /speed:?\s*(\d+)\s*mph/i
  ],
  range: [
    /range:?\s*(\d+)\s*miles/i,
    /(\d+)\s*mile\s*range/i,
    /up to\s*(\d+)\s*miles/i
  ],
  weight: [
    /weight:?\s*(\d+)\s*lbs/i,
    /(\d+)\s*pounds/i,
    /(\d+)lbs/i,
    /weight:?\s*(\d+)\s*kg/i
  ]
};

module.exports = {
  dataSources,
  specPatterns
};