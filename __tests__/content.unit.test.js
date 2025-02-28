// Replace ES module imports with CommonJS require
const { extractCraigslistData } = require('../web_extension/chrome/content.js');

describe('Content Script Unit Tests', () => {
  beforeEach(() => {
    // Mock DOM elements for testing
    document.body.innerHTML = `
      <div id="titletextonly">2018 Trek Bike</div>
      <span class="price">$500</span>
      <time class="date timeago">2023-06-15</time>
      <div class="mapaddress">123 Main St, City</div>
      <section id="postingbody">Great condition Trek bike for sale.</section>
      <div id="thumbs">
        <a class="thumb" href="#"><img src="https://images.craigslist.org/00101_abc123_50x50c.jpg"></a>
        <a class="thumb" href="#"><img src="https://images.craigslist.org/00202_def456_50x50c.jpg"></a>
      </div>
      <div class="attrgroup">
        <span>make / manufacturer: Trek</span>
        <span>model name / number: FX</span>
        <span>bicycle type: hybrid</span>
      </div>
    `;
    
    // Mock window.location
    delete window.location;
    window.location = {
      href: 'https://craigslist.org/d/bicycles/12345.html',
      pathname: '/d/bicycles/12345.html'
    };
  });

  test('extractCraigslistData extracts correct information', () => {
    const data = extractCraigslistData();
    
    expect(data.title).toBe('2018 Trek Bike');
    expect(data.price).toBe('$500');
    expect(data.location).toBe('123 Main St, City');
    expect(data.attributes['make / manufacturer']).toBe('Trek');
    expect(data.images).toBeDefined();
    expect(data.postId).toBe('12345');
  });
  
  test('handles missing elements gracefully', () => {
    // Remove title element
    document.querySelector('#titletextonly').remove();
    
    // Should throw error for missing title
    expect(() => extractCraigslistData()).toThrow('Could not find post title');
  });
});