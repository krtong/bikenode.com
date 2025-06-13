# BikeNode Profile Image Generator

> **⚠️ Important Note**
> These are temporary placeholder images for development only.
> Production should use real user-uploaded images, not AI-generated placeholders.

This script generates all the placeholder images needed for the BikeNode profile page using DALL-E 3.

## Images Generated

### Profile Images
- `nerd_blank_profile.png` - Default avatar placeholder
- `profile-cover-default.jpg` - Profile cover photo (banner)

### Motorcycle Images  
- `yamaha-r1.jpg` - 2025 Yamaha YZF-R1
- `ducati-v4.jpg` - 2024 Ducati Panigale V4S
- `honda-cbr.jpg` - 2023 Honda CBR1000RR-R
- `bmw-gs.jpg` - 2022 BMW R1250GS Adventure

### Gear Images
- `helmet-1.jpg` - Racing helmet
- `jacket-1.jpg` - Leather racing jacket
- `gloves-1.jpg` - Racing gloves
- `pants-1.jpg` - Leather racing pants
- `boots-1.jpg` - Racing boots
- `gear-placeholder.png` - Generic gear placeholder

## Setup

1. **Get OpenAI API Key**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key

2. **Install Dependencies**
   ```bash
   cd website/scripts
   npm install
   ```

3. **Set Environment Variable**
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

4. **Run the Generator**
   ```bash
   npm run generate
   ```

## Output

Images will be saved to:
- `/website/assets/images/` - Profile images
- `/website/assets/images/bikes/` - Motorcycle images
- `/website/assets/images/gear/` - Gear images

A preview page will be created at `/website/assets/images/preview.html`

## Cost Estimate

- Total images: 12
- Cost per image: ~$0.08 (HD quality)
- Total cost: ~$0.96

## Rate Limits

DALL-E 3 has a rate limit of 3 images per minute. The script automatically waits 20 seconds between images.

Total generation time: ~4 minutes

## Alternative Services

If you prefer other services, check `quick-image-generator.js` which supports:
- Leonardo.AI
- Ideogram  
- Flux Pro
- Stable Diffusion