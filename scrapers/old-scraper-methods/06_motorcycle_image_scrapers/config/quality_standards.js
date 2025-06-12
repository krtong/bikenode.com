// Enhanced Quality Standards for Motorcycle Image Acquisition
// Focus on high-quality product/hero images with manufacturer source prioritization

export const QUALITY_STANDARDS = {
    // Minimum image requirements
    MIN_WIDTH: 800,
    MIN_HEIGHT: 600,
    MIN_FILE_SIZE: 50000, // 50KB minimum for quality images
    MAX_FILE_SIZE: 10000000, // 10MB maximum
    
    // Preferred image dimensions for hero images
    PREFERRED_ASPECT_RATIOS: [
        { ratio: 16/9, weight: 1.0 },   // Modern widescreen
        { ratio: 4/3, weight: 0.9 },    // Classic format
        { ratio: 3/2, weight: 0.8 },    // Photography standard
    ],
    
    // Quality scoring weights
    QUALITY_WEIGHTS: {
        SOURCE_AUTHORITY: 0.4,      // Official manufacturer sites get highest priority
        IMAGE_SIZE: 0.25,           // Larger images generally better quality
        ASPECT_RATIO: 0.15,         // Proper aspect ratios preferred
        FILE_SIZE: 0.1,             // Reasonable file size indicates quality
        URL_QUALITY: 0.1            // Clean URLs from reputable sources
    },
    
    // Manufacturer official domains for prioritization
    MANUFACTURER_DOMAINS: {
        'ducati': ['ducati.com', 'ducati.it', 'ducati.de', 'ducati.co.uk'],
        'honda': ['honda.com', 'honda.ca', 'honda.co.uk', 'honda.de', 'honda.it'],
        'yamaha': ['yamaha-motor.com', 'yamaha-motor.co.uk', 'yamaha-motor.de'],
        'kawasaki': ['kawasaki.com', 'kawasaki.co.uk', 'kawasaki.de', 'kawasaki.it'],
        'suzuki': ['suzuki.com', 'suzuki.co.uk', 'suzuki.de', 'suzuki.it'],
        'bmw': ['bmw-motorrad.com', 'bmw-motorrad.co.uk', 'bmw-motorrad.de'],
        'ktm': ['ktm.com', 'ktm.co.uk', 'ktm.de', 'ktm.it'],
        'harley-davidson': ['harley-davidson.com', 'harley-davidson.co.uk'],
        'triumph': ['triumph.co.uk', 'triumphmotorcycles.com', 'triumph.de'],
        'aprilia': ['aprilia.com', 'aprilia.co.uk', 'aprilia.de'],
        'mv-agusta': ['mvagusta.com', 'mvagusta.it'],
        'indian': ['indianmotorcycle.com', 'indianmotorcycle.co.uk']
    },
    
    // High-authority motorcycle sites for quality images
    TRUSTED_SOURCES: [
        'cycleworld.com',
        'motorcycle.com', 
        'motorcyclenews.com',
        'rideapart.com',
        'webbikeworld.com',
        'ultimatemotorcycling.com',
        'motorcyclistonline.com',
        'revzilla.com',
        'autoevolution.com'
    ],
    
    // URL patterns that indicate quality product images
    QUALITY_URL_PATTERNS: [
        /hero/i,
        /product/i,
        /gallery/i,
        /press/i,
        /official/i,
        /lineup/i,
        /model/i,
        /\d{4}x\d{4}/,  // Resolution in URL
        /large/i,
        /full/i
    ],
    
    // URL patterns to avoid (usually low quality)
    AVOID_URL_PATTERNS: [
        /thumb/i,
        /small/i,
        /mini/i,
        /icon/i,
        /avatar/i,
        /logo/i,
        /badge/i,
        /\d{2,3}x\d{2,3}/, // Small resolutions
        /150x/i,
        /200x/i,
        /300x/i
    ]
};

export const IMAGE_CATEGORIES = {
    HERO: 'hero',           // Main product showcase image
    PROFILE: 'profile',     // Side profile view
    DETAIL: 'detail',       // Close-up details
    ACTION: 'action',       // In-use/riding images
    STUDIO: 'studio'        // Clean studio photography
};

export const SEARCH_STRATEGIES = {
    // Official manufacturer website search first
    MANUFACTURER_DIRECT: {
        priority: 1,
        maxImages: 5,
        searchTerms: ['{year} {make} {model}', '{make} {model} {year}']
    },
    
    // High-authority motorcycle sites
    TRUSTED_SITES: {
        priority: 2, 
        maxImages: 3,
        searchTerms: ['{year} {make} {model} review', '{make} {model} {year} specs']
    },
    
    // General search with quality filters
    GENERAL_SEARCH: {
        priority: 3,
        maxImages: 2,
        searchTerms: ['{year} {make} {model} motorcycle', '{make} {model} {year} bike']
    }
};
