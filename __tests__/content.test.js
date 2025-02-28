import { extractCraigslistData } from '../web_extension/chrome/content.js';

describe('Content Script Unit Tests', () => {
  beforeEach(() => {
    // Setup mock DOM for Craigslist page
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

  test('extractCraigslistData extracts all fields correctly', () => {
    const result = extractCraigslistData();
    
    expect(result).toEqual({
      title: '2018 Trek Bike',
      price: '$500',
      postingTime: '2023-06-15',
      location: '123 Main St, City',
      description: 'Great condition Trek bike for sale.',
      images: [
        'https://images.craigslist.org/00101_abc123_600x450.jpg',
        'https://images.craigslist.org/00202_def456_600x450.jpg'
      ],
      attributes: {
        'make / manufacturer': 'Trek',
        'model name / number': 'FX',
        'bicycle type': 'hybrid'
      },
      postId: '12345',
      url: 'https://craigslist.org/d/bicycles/12345.html',
      extractedAt: expect.any(String)
    });
  });

  test('handles missing elements gracefully', () => {
    // Remove some elements
    document.querySelector('#titletextonly').remove();
    document.querySelector('.price').remove();
    
    // Should throw error when title is missing
    expect(() => extractCraigslistData()).toThrow('Could not find post title');
  });
});