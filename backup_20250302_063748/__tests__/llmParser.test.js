const { parseWithLLM } = require('../web_extension/chrome/llmParser');

describe('LLM Parser Tests', () => {
  // Mock the LLM API call
  beforeEach(() => {
    // This would be replaced with a proper mock if we were using a real API
    global.fetchMock = jest.fn();
  });

  test('Should parse bike listing text into structured data', async () => {
    const mockText = `
      Trek Domane SL5 Road Bike - 56cm - $2500 (San Francisco)
      
      Up for sale is my Trek Domane SL5 road bike in excellent condition. 
      Carbon frame, Shimano 105 groupset. 56cm frame size.
      700c wheels with Continental GP5000 tires. Hydraulic disc brakes.
      Only 1500 miles, no crashes or damage. 
      Located in San Francisco, CA.
    `;
    
    const result = await parseWithLLM(mockText);
    
    // Verify structure of returned data
    expect(result).toHaveProperty('itemType');
    expect(result).toHaveProperty('make');
    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('askingPrice');
    
    // Verify specific data
    expect(result.itemType).toBe('bike');
    expect(result.make).toBe('Trek');
    expect(result.model).toBe('Domane SL5');
    expect(result.askingPrice).toBe(2500);
    expect(result.condition).toBe('excellent');
  });
  
  test('Should parse bicycle component listing correctly', async () => {
    const mockText = `
      Shimano Ultegra R8000 Crankset 52/36 172.5mm - $150 (Oakland)
      
      Selling a lightly used Shimano Ultegra R8000 crankset. 52/36 chainrings, 172.5mm crank length.
      About 2000 miles on it, no damage, works perfectly. 
      Asking $150, located in Oakland.
    `;
    
    const result = await parseWithLLM(mockText);
    
    expect(result.itemType).toBe('bicycle component');
    expect(result.make).toBe('Shimano');
    expect(result.model).toBe('Ultegra R8000');
    expect(result.askingPrice).toBe(150);
  });
  
  test('Should handle error cases gracefully', async () => {
    // Simulate an empty input
    const result = await parseWithLLM('');
    
    expect(result).toHaveProperty('error');
  });
});
