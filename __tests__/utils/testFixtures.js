/**
 * Test fixtures for bike parser extension testing
 */

/**
 * Collection of bike listing templates for various bike types
 */
const BIKE_FIXTURES = {
  roadBike: {
    title: 'Trek Domane SL5 Road Bike - 56cm - $2500',
    brand: 'Trek',
    model: 'Domane SL5',
    bikeType: 'road bike',
    frameSize: '56cm',
    frameMaterial: 'Carbon',
    componentGroup: '105',
    wheelSize: '700c',
    condition: 'excellent',
    price: '$2500',
    postId: '12345678',
    postedDate: '2023-05-15',
    location: 'San Francisco, CA',
    description: 'Trek Domane SL5 in excellent condition, 56cm frame size. Carbon frame, Shimano 105 groupset. 700c wheels with Continental GP5000 tires. Hydraulic disc brakes.'
  },
  
  mountainBike: {
    title: 'Specialized Stumpjumper - Large Frame - $3500',
    brand: 'Specialized',
    model: 'Stumpjumper',
    bikeType: 'mountain bike',
    frameSize: 'L',
    frameMaterial: 'Carbon',
    componentGroup: 'GX Eagle',
    wheelSize: '29',
    condition: 'excellent',
    price: '$3500',
    postId: '87654321',
    postedDate: '2023-05-20',
    location: 'Mill Valley, CA', 
    description: '2021 Specialized Stumpjumper FSR, large frame size. Carbon frame, Fox suspension, SRAM GX Eagle groupset. 29" wheels, excellent condition, low miles.'
  },
  
  hybridBike: {
    title: 'Giant Escape 2 Hybrid Bike - Medium - $600',
    brand: 'Giant',
    model: 'Escape 2',
    bikeType: 'hybrid bike',
    frameSize: 'M',
    frameMaterial: 'Aluminum',
    componentGroup: 'Altus',
    wheelSize: '700c',
    condition: 'good',
    price: '$600',
    postId: '55556666',
    postedDate: '2023-05-25',
    location: 'Oakland, CA',
    description: 'Giant Escape 2 hybrid bike in good condition. Medium frame, aluminum. Great commuter bike with rack and fenders. Shimano Altus components.'
  }
};

/**
 * Collection of non-bike listing templates
 */
const NON_BIKE_FIXTURES = {
  furniture: {
    title: 'Modern Coffee Table - $200',
    category: 'furniture > tables',
    price: '$200',
    condition: 'good',
    location: 'San Francisco, CA',
    description: 'Modern coffee table, wood top with metal legs. Dimensions: 48" x 24" x 18"H. Minor scratches but overall good condition.'
  },
  
  bikeRack: {
    title: 'Thule Bike Rack for Car - $150',
    category: 'sporting goods > bicycle accessories',
    price: '$150', 
    condition: 'like new',
    location: 'Berkeley, CA',
    description: 'Thule bike rack for car, fits 2 bikes. Used only a few times, in like new condition. Works with most sedans and SUVs.'
  }
};

/**
 * HTML templates that can cause issues with the parser
 */
const PROBLEMATIC_HTML_FIXTURES = {
  missingPrice: `
    <!DOCTYPE html>
    <html>
      <head><title>Trek Road Bike - Make Offer (SF)</title></head>
      <body>
        <section class="breadcrumbs">bikes > road bike</section>
        <h1 class="postingtitletext">Trek Road Bike - Make Offer</h1>
        <div id="postingbody">Trek road bike for sale, make an offer.</div>
      </body>
    </html>
  `,
  
  emptyBody: `
    <!DOCTYPE html>
    <html>
      <head><title>Mountain Bike - $1000</title></head>
      <body>
        <section class="breadcrumbs">bikes > mountain bike</section>
        <h1 class="postingtitletext">Mountain Bike</h1>
        <span class="price">$1000</span>
        <div id="postingbody"></div>
      </body>
    </html>
  `,
  
  malformedHTML: `
    <!DOCTYPE html>
    <html>
      <head><title>Cannondale Bike</title>
      <body>
        <h1 class="postingtitletext">Cannondale Bike
        <span class="price">$1500
        <div id="postingbody">Cannondale road bike for sale.
      </body>
    </html>
  `
};

/**
 * Collection of search results pages (listing multiple bikes)
 */
const SEARCH_RESULTS_FIXTURES = {
  bikeSearchResults: `
    <!DOCTYPE html>
    <html>
      <head>
        <title>bikes - bicycles - by owner - craigslist</title>
      </head>
      <body>
        <div class="cl-search-results">
          <div class="result-row">
            <a href="/posts/12345.html">Trek Domane SL5 - $2500</a>
          </div>
          <div class="result-row">
            <a href="/posts/67890.html">Specialized Stumpjumper - $3500</a>
          </div>
          <div class="result-row">
            <a href="/posts/13579.html">Cannondale SuperSix - $2000</a>
          </div>
        </div>
      </body>
    </html>
  `
};

module.exports = {
  BIKE_FIXTURES,
  NON_BIKE_FIXTURES,
  PROBLEMATIC_HTML_FIXTURES,
  SEARCH_RESULTS_FIXTURES
};
