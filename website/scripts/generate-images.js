// Image Generation Script Options

// Option 1: OpenAI DALL-E 3
const { Configuration, OpenAIApi } = require('openai');

async function generateWithDallE(prompt) {
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const response = await openai.createImage({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return response.data.data[0].url;
  } catch (error) {
    console.error('DALL-E error:', error);
  }
}

// Option 2: Stability AI (Stable Diffusion)
const axios = require('axios');

async function generateWithStabilityAI(prompt) {
  const engineId = 'stable-diffusion-xl-1024-v1-0';
  const apiHost = 'https://api.stability.ai';
  const apiKey = process.env.STABILITY_API_KEY;

  const response = await axios.post(
    `${apiHost}/v1/generation/${engineId}/text-to-image`,
    {
      text_prompts: [{ text: prompt }],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      steps: 30,
      samples: 1,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const image = response.data.artifacts[0];
  return Buffer.from(image.base64, 'base64');
}

// Option 3: Replicate (Multiple Models)
const Replicate = require('replicate');

async function generateWithReplicate(prompt) {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: prompt,
        negative_prompt: "low quality, blurry, distorted",
        width: 1024,
        height: 1024,
        num_outputs: 1,
      }
    }
  );

  return output[0];
}

// Motorcycle-specific prompts
const motorcyclePrompts = {
  bikes: [
    {
      model: "Yamaha YZF-R1",
      prompt: "Professional product photo of a 2025 Yamaha YZF-R1 sportbike, blue and black color scheme, studio lighting, white background, 3/4 front view, highly detailed, commercial photography"
    },
    {
      model: "Ducati Panigale V4S",
      prompt: "Professional product photo of a 2024 Ducati Panigale V4S, red Italian racing motorcycle, studio lighting, white background, side profile view, highly detailed, commercial photography"
    },
    {
      model: "Honda CBR1000RR-R Fireblade SP",
      prompt: "Professional product photo of a 2023 Honda CBR1000RR-R Fireblade SP, tricolor HRC livery, studio lighting, white background, 3/4 front view, highly detailed, commercial photography"
    },
    {
      model: "BMW R1250GS Adventure",
      prompt: "Professional product photo of a 2022 BMW R1250GS Adventure, grey and black adventure touring motorcycle with panniers, studio lighting, white background, 3/4 view, highly detailed"
    }
  ],
  gear: [
    {
      item: "Racing Helmet",
      prompt: "Professional product photo of a premium racing motorcycle helmet, matte black with subtle graphics, studio lighting, white background, 3/4 view, highly detailed"
    },
    {
      item: "Leather Jacket",
      prompt: "Professional product photo of a motorcycle racing leather jacket, black and white with armor protection visible, studio lighting, white background, front view, highly detailed"
    },
    {
      item: "Racing Gloves",
      prompt: "Professional product photo of motorcycle racing gloves, black leather with carbon fiber knuckle protection, studio lighting, white background, pair shown, highly detailed"
    },
    {
      item: "Racing Boots",
      prompt: "Professional product photo of motorcycle racing boots, black and red leather with toe sliders, studio lighting, white background, side view, highly detailed"
    }
  ]
};

// Batch generation function
async function generateAllImages(generator = 'dalle') {
  const fs = require('fs').promises;
  const path = require('path');
  
  // Create directories
  await fs.mkdir('generated_images/bikes', { recursive: true });
  await fs.mkdir('generated_images/gear', { recursive: true });

  // Generate bike images
  for (const bike of motorcyclePrompts.bikes) {
    console.log(`Generating ${bike.model}...`);
    let imageUrl;
    
    switch(generator) {
      case 'dalle':
        imageUrl = await generateWithDallE(bike.prompt);
        // Download and save image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        await fs.writeFile(
          path.join('generated_images/bikes', `${bike.model.replace(/\s+/g, '_').toLowerCase()}.png`),
          response.data
        );
        break;
      case 'stability':
        const imageBuffer = await generateWithStabilityAI(bike.prompt);
        await fs.writeFile(
          path.join('generated_images/bikes', `${bike.model.replace(/\s+/g, '_').toLowerCase()}.png`),
          imageBuffer
        );
        break;
      case 'replicate':
        imageUrl = await generateWithReplicate(bike.prompt);
        const repResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        await fs.writeFile(
          path.join('generated_images/bikes', `${bike.model.replace(/\s+/g, '_').toLowerCase()}.png`),
          repResponse.data
        );
        break;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Generate gear images
  for (const gear of motorcyclePrompts.gear) {
    console.log(`Generating ${gear.item}...`);
    // Similar generation logic...
  }

  console.log('Image generation complete!');
}

// Usage
if (require.main === module) {
  // Choose your generator: 'dalle', 'stability', or 'replicate'
  generateAllImages('dalle').catch(console.error);
}

module.exports = {
  generateWithDallE,
  generateWithStabilityAI,
  generateWithReplicate,
  generateAllImages
};