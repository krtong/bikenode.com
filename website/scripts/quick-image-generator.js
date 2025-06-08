// Quick Image Generator - Best Midjourney Alternatives
// Focuses on the highest quality options with APIs

const path = require('path');

// Load environment variables from root .env file
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const axios = require('axios');
const fs = require('fs').promises;

// Configuration for different services
const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'dall-e-3',
    quality: 'hd', // 'standard' or 'hd'
    style: 'natural' // 'natural' or 'vivid'
  },
  leonardo: {
    apiKey: process.env.LEONARDO_API_KEY,
    model: 'leonardo-diffusion-xl',
    preset: 'LEONARDO'
  },
  ideogram: {
    apiKey: process.env.IDEOGRAM_API_KEY,
    model: 'V_2',
    stylePreset: 'REALISTIC'
  },
  flux: {
    apiKey: process.env.FAL_API_KEY,
    model: 'flux-pro',
    steps: 50
  }
};

// Service implementations
class ImageGenerators {
  // DALL-E 3 - Best for consistent quality
  static async generateWithDallE3(prompt) {
    const { Configuration, OpenAIApi } = require('openai');
    const configuration = new Configuration({
      apiKey: config.openai.apiKey,
    });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createImage({
      model: config.openai.model,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: config.openai.quality,
      style: config.openai.style
    });

    return response.data.data[0].url;
  }

  // Leonardo.AI - Midjourney competitor
  static async generateWithLeonardo(prompt) {
    const response = await axios.post(
      'https://cloud.leonardo.ai/api/rest/v1/generations',
      {
        prompt: prompt,
        modelId: config.leonardo.model,
        width: 1024,
        height: 1024,
        num_images: 1,
        presetStyle: config.leonardo.preset,
        public: false
      },
      {
        headers: {
          'Authorization': `Bearer ${config.leonardo.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const generationId = response.data.sdGenerationJob.generationId;
    
    // Poll for completion
    let result;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(
        `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.leonardo.apiKey}`
          }
        }
      );
      
      if (statusResponse.data.generations_by_pk.status === 'COMPLETE') {
        result = statusResponse.data.generations_by_pk.generated_images[0].url;
        break;
      }
    }
    
    return result;
  }

  // Ideogram - Excellent text rendering
  static async generateWithIdeogram(prompt) {
    const response = await axios.post(
      'https://api.ideogram.ai/generate',
      {
        prompt: prompt,
        model: config.ideogram.model,
        style_preset: config.ideogram.stylePreset,
        aspect_ratio: '1:1',
        num_images: 1
      },
      {
        headers: {
          'Api-Key': config.ideogram.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.images[0].url;
  }

  // Flux via FAL.ai - Latest technology
  static async generateWithFlux(prompt) {
    const response = await axios.post(
      'https://fal.run/fal-ai/flux-pro',
      {
        prompt: prompt,
        image_size: 'square',
        num_inference_steps: config.flux.steps,
        guidance_scale: 7.5,
        num_images: 1
      },
      {
        headers: {
          'Authorization': `Key ${config.flux.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // FAL returns a URL to poll
    const resultUrl = response.data.url;
    
    // Poll for result
    let result;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await axios.get(resultUrl, {
        headers: {
          'Authorization': `Key ${config.flux.apiKey}`
        }
      });
      
      if (statusResponse.data.status === 'completed') {
        result = statusResponse.data.images[0].url;
        break;
      }
    }
    
    return result;
  }
}

// Optimized prompts for motorcycles
const motorcyclePromptTemplates = {
  product: (model) => `Professional product photography of ${model}, studio lighting, clean white background, 3/4 view angle, ultra detailed, commercial quality, sharp focus, high resolution`,
  
  action: (model) => `${model} motorcycle in motion, dynamic action shot, motion blur on background, sharp motorcycle, professional photography, dramatic lighting`,
  
  lifestyle: (model) => `${model} parked at scenic mountain overlook, golden hour lighting, lifestyle photography, shallow depth of field, cinematic composition`,
  
  detail: (part) => `Extreme close-up macro photography of motorcycle ${part}, studio lighting, product photography, ultra sharp, high detail`
};

// Generate images with multiple services for comparison
async function generateComparison(prompt, filename) {
  console.log(`Generating images for: ${prompt}`);
  
  const results = {};
  
  // Try each service
  const services = [
    { name: 'dalle3', fn: ImageGenerators.generateWithDallE3 },
    { name: 'leonardo', fn: ImageGenerators.generateWithLeonardo },
    { name: 'ideogram', fn: ImageGenerators.generateWithIdeogram },
    { name: 'flux', fn: ImageGenerators.generateWithFlux }
  ];
  
  for (const service of services) {
    try {
      console.log(`  Trying ${service.name}...`);
      const url = await service.fn(prompt);
      
      if (url) {
        // Download image
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const outputPath = path.join('generated_images', `${filename}_${service.name}.png`);
        await fs.writeFile(outputPath, response.data);
        
        results[service.name] = {
          success: true,
          path: outputPath
        };
        console.log(`  ✅ ${service.name} complete`);
      }
    } catch (error) {
      console.log(`  ❌ ${service.name} failed:`, error.message);
      results[service.name] = {
        success: false,
        error: error.message
      };
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return results;
}

// Main execution
async function main() {
  // Create output directory
  await fs.mkdir('generated_images', { recursive: true });
  
  // Test motorcycle images
  const tests = [
    {
      prompt: motorcyclePromptTemplates.product('2025 Yamaha YZF-R1 sport bike'),
      filename: 'yamaha_r1'
    },
    {
      prompt: motorcyclePromptTemplates.action('Ducati Panigale V4'),
      filename: 'ducati_action'
    },
    {
      prompt: 'Motorcycle helmet with text "SHOEI RF-1400" on the side, product photography',
      filename: 'helmet_with_text'
    }
  ];
  
  const allResults = {};
  
  for (const test of tests) {
    console.log(`\n=== ${test.filename} ===`);
    allResults[test.filename] = await generateComparison(test.prompt, test.filename);
  }
  
  // Generate comparison HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Image Generation Comparison</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
    .comparison { margin-bottom: 40px; background: white; padding: 20px; border-radius: 10px; }
    .prompt { font-weight: bold; margin-bottom: 20px; padding: 10px; background: #e0e0e0; }
    .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .image-box { text-align: center; }
    .image-box img { max-width: 100%; border: 1px solid #ddd; }
    .service-name { font-weight: bold; margin: 10px 0; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>Image Generation Service Comparison</h1>
  ${tests.map(test => `
    <div class="comparison">
      <div class="prompt">Prompt: ${test.prompt}</div>
      <div class="images">
        ${Object.entries(allResults[test.filename]).map(([service, result]) => `
          <div class="image-box">
            <div class="service-name">${service.toUpperCase()}</div>
            ${result.success 
              ? `<img src="${result.path}" alt="${service}">` 
              : `<div class="error">Failed: ${result.error}</div>`
            }
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>
  `;
  
  await fs.writeFile('generated_images/comparison.html', html);
  console.log('\n✅ Comparison complete! Open generated_images/comparison.html to view results.');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  ImageGenerators,
  generateComparison,
  motorcyclePromptTemplates
};