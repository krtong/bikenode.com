/**
 * Batch Logo Processor
 * Handles quality validation, PNG conversion, and logo standardization
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class BatchLogoProcessor {
  constructor() {
    this.baseDir = __dirname;
    this.inputDir = path.join(this.baseDir, 'images', 'verified');
    this.outputDir = path.join(this.baseDir, 'images', 'processed');
    this.standards = {
      formats: [
        { size: 2048, suffix: '_2048' },
        { size: 1024, suffix: '_1024' },
        { size: 512, suffix: '_512' },
        { size: 256, suffix: '_256' },
        { size: 128, suffix: '_128' },
        { size: 64, suffix: '_64' },
        { size: 32, suffix: '_32' }
      ],
      quality: {
        minWidth: 512,
        minHeight: 512,
        preferredWidth: 1024,
        preferredHeight: 1024,
        maxFileSize: 10 * 1024 * 1024, // 10MB for higher res images
        requiredFormat: 'png'
      }
    };
  }

  async processAllLogos() {
    console.log('🔄 Starting batch logo processing...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Get all verified logos
    const logoFiles = fs.readdirSync(this.inputDir)
      .filter(file => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file));

    console.log(`📁 Found ${logoFiles.length} logo files to process`);

    const results = {
      processed: 0,
      errors: 0,
      details: []
    };

    for (const file of logoFiles) {
      try {
        console.log(`\n🏷️  Processing: ${file}`);
        const result = await this.processLogo(file);
        results.details.push(result);
        
        if (result.success) {
          results.processed++;
          console.log(`   ✅ Success: Generated ${result.variants.length} variants`);
        } else {
          results.errors++;
          console.log(`   ❌ Error: ${result.error}`);
        }
      } catch (error) {
        results.errors++;
        console.error(`   💥 Failed to process ${file}:`, error.message);
        results.details.push({
          file: file,
          success: false,
          error: error.message
        });
      }
    }

    // Generate summary report
    const report = {
      timestamp: new Date().toISOString(),
      totalFiles: logoFiles.length,
      processed: results.processed,
      errors: results.errors,
      details: results.details
    };

    const reportPath = path.join(this.baseDir, 'processing_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Processing complete!`);
    console.log(`   ✅ Successfully processed: ${results.processed}`);
    console.log(`   ❌ Errors: ${results.errors}`);
    console.log(`   📄 Report saved to: ${reportPath}`);

    return report;
  }

  async processLogo(filename) {
    const inputPath = path.join(this.inputDir, filename);
    const brandName = this.extractBrandName(filename);
    
    try {
      // Validate input image
      const validation = await this.validateImage(inputPath);
      if (!validation.isValid) {
        return {
          file: filename,
          brand: brandName,
          success: false,
          error: `Validation failed: ${validation.issues.join(', ')}`
        };
      }

      // Generate all size variants
      const variants = [];
      
      for (const format of this.standards.formats) {
        try {
          const outputFilename = `${brandName}${format.suffix}.png`;
          const outputPath = path.join(this.outputDir, outputFilename);
          
          await this.generateVariant(inputPath, outputPath, format.size);
          
          const stats = fs.statSync(outputPath);
          variants.push({
            size: format.size,
            filename: outputFilename,
            fileSize: stats.size,
            path: outputPath
          });
        } catch (error) {
          console.warn(`     ⚠️  Failed to generate ${format.size}px variant: ${error.message}`);
        }
      }

      // Generate favicon
      try {
        const faviconPath = path.join(this.outputDir, `${brandName}_favicon.ico`);
        await this.generateFavicon(inputPath, faviconPath);
        variants.push({
          size: 'favicon',
          filename: `${brandName}_favicon.ico`,
          fileSize: fs.statSync(faviconPath).size,
          path: faviconPath
        });
      } catch (error) {
        console.warn(`     ⚠️  Failed to generate favicon: ${error.message}`);
      }

      return {
        file: filename,
        brand: brandName,
        success: true,
        variants: variants,
        originalSize: validation.metadata
      };

    } catch (error) {
      return {
        file: filename,
        brand: brandName,
        success: false,
        error: error.message
      };
    }
  }

  async validateImage(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      
      const validation = {
        isValid: true,
        issues: [],
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: fs.statSync(imagePath).size
        }
      };

      // Check dimensions
      if (metadata.width < this.standards.quality.minWidth) {
        validation.issues.push(`Width too small: ${metadata.width}px (min: ${this.standards.quality.minWidth}px)`);
      }
      
      if (metadata.height < this.standards.quality.minHeight) {
        validation.issues.push(`Height too small: ${metadata.height}px (min: ${this.standards.quality.minHeight}px)`);
      }

      // Check file size
      if (validation.metadata.size > this.standards.quality.maxFileSize) {
        validation.issues.push(`File too large: ${(validation.metadata.size / 1024 / 1024).toFixed(1)}MB (max: 5MB)`);
      }

      // Check if image is corrupted
      try {
        await sharp(imagePath).metadata();
      } catch (error) {
        validation.issues.push(`Image appears corrupted: ${error.message}`);
      }

      validation.isValid = validation.issues.length === 0;
      return validation;

    } catch (error) {
      return {
        isValid: false,
        issues: [`Cannot read image: ${error.message}`]
      };
    }
  }

  async generateVariant(inputPath, outputPath, targetSize) {
    await sharp(inputPath)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
      })
      .png({
        quality: 100,
        compressionLevel: 6,
        adaptiveFiltering: true
      })
      .toFile(outputPath);
  }

  async generateFavicon(inputPath, outputPath) {
    // Generate ICO format for favicon
    const icoSizes = [16, 32, 48];
    const buffers = [];

    for (const size of icoSizes) {
      const buffer = await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer();
      buffers.push(buffer);
    }

    // For simplicity, just create a 32x32 PNG as "favicon"
    // In production, you'd want to use a proper ICO library
    await sharp(inputPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath.replace('.ico', '.png'));
  }

  extractBrandName(filename) {
    // Extract brand name from filename
    return filename
      .replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, '')
      .replace(/_verified$/i, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
  }

  async generateLogoManifest() {
    console.log('📋 Generating logo manifest...');
    
    const logoFiles = fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.png'));

    const manifest = {
      generated: new Date().toISOString(),
      totalLogos: 0,
      brands: {}
    };

    // Group files by brand
    logoFiles.forEach(file => {
      const parts = file.split('_');
      if (parts.length >= 2) {
        const brand = parts[0];
        const variant = parts[1].replace('.png', '');
        
        if (!manifest.brands[brand]) {
          manifest.brands[brand] = {
            name: brand,
            variants: {},
            totalVariants: 0
          };
        }
        
        manifest.brands[brand].variants[variant] = {
          filename: file,
          path: path.join(this.outputDir, file),
          size: this.getFileSizeSync(path.join(this.outputDir, file))
        };
        
        manifest.brands[brand].totalVariants++;
      }
    });

    manifest.totalLogos = Object.keys(manifest.brands).length;

    const manifestPath = path.join(this.baseDir, 'logo_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`📄 Logo manifest saved to: ${manifestPath}`);
    console.log(`🏷️  Total brands: ${manifest.totalLogos}`);

    return manifest;
  }

  getFileSizeSync(filePath) {
    try {
      return fs.statSync(filePath).size;
    } catch (error) {
      return 0;
    }
  }

  async createWebOptimizedVersions() {
    console.log('🌐 Creating web-optimized versions...');
    
    const webDir = path.join(this.outputDir, 'web');
    if (!fs.existsSync(webDir)) {
      fs.mkdirSync(webDir, { recursive: true });
    }

    const logoFiles = fs.readdirSync(this.outputDir)
      .filter(file => file.includes('_256.png') || file.includes('_128.png'));

    for (const file of logoFiles) {
      const inputPath = path.join(this.outputDir, file);
      const outputPath = path.join(webDir, file.replace('.png', '_optimized.png'));
      
      try {
        await sharp(inputPath)
          .png({
            quality: 80,
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true // Use palette for smaller file size
          })
          .toFile(outputPath);
        
        console.log(`   ✅ Optimized: ${file}`);
      } catch (error) {
        console.warn(`   ⚠️  Failed to optimize ${file}: ${error.message}`);
      }
    }
  }

  async validateProcessedLogos() {
    console.log('🔍 Validating processed logos...');
    
    const logoFiles = fs.readdirSync(this.outputDir)
      .filter(file => file.endsWith('.png'));

    const validation = {
      valid: 0,
      invalid: 0,
      issues: []
    };

    for (const file of logoFiles) {
      try {
        const filePath = path.join(this.outputDir, file);
        const metadata = await sharp(filePath).metadata();
        
        if (metadata.width > 0 && metadata.height > 0) {
          validation.valid++;
        } else {
          validation.invalid++;
          validation.issues.push(`${file}: Invalid dimensions`);
        }
      } catch (error) {
        validation.invalid++;
        validation.issues.push(`${file}: ${error.message}`);
      }
    }

    console.log(`   ✅ Valid logos: ${validation.valid}`);
    console.log(`   ❌ Invalid logos: ${validation.invalid}`);
    
    if (validation.issues.length > 0) {
      console.log('   Issues found:');
      validation.issues.forEach(issue => console.log(`     - ${issue}`));
    }

    return validation;
  }
}

// Run if called directly
if (require.main === module) {
  const processor = new BatchLogoProcessor();
  
  async function run() {
    try {
      const report = await processor.processAllLogos();
      await processor.generateLogoManifest();
      await processor.createWebOptimizedVersions();
      await processor.validateProcessedLogos();
      
      console.log('\n🎉 All processing complete!');
    } catch (error) {
      console.error('💥 Processing failed:', error);
    }
  }
  
  run();
}

module.exports = { BatchLogoProcessor };