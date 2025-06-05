#!/usr/bin/env node

/**
 * Logo Acquisition CLI
 * Command-line interface for motorcycle logo management
 */

const { MotorcycleLogoScraper } = require('./motorcycle_logo_scraper.js');
const { LogoVerificationServer } = require('./manual_verification_server.js');
const { BatchLogoProcessor } = require('./batch_logo_processor.js');
const fs = require('fs');
const path = require('path');

class LogoCLI {
  constructor() {
    this.commands = {
      'search': this.searchLogos.bind(this),
      'verify': this.startVerificationServer.bind(this),
      'process': this.processLogos.bind(this),
      'status': this.showStatus.bind(this),
      'help': this.showHelp.bind(this),
      'install': this.installDependencies.bind(this),
      'clean': this.cleanDirectories.bind(this),
      'export': this.exportLogos.bind(this)
    };
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    console.log('🏍️  Motorcycle Logo Acquisition System');
    console.log('=====================================\n');

    if (!this.commands[command]) {
      console.error(`❌ Unknown command: ${command}`);
      this.showHelp();
      return;
    }

    try {
      await this.commands[command](args.slice(1));
    } catch (error) {
      console.error(`💥 Error executing ${command}:`, error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  async searchLogos(args) {
    console.log('🔍 Starting automated logo search...\n');
    
    const scraper = new MotorcycleLogoScraper();
    
    if (args[0] === '--single' && args[1]) {
      // Search for a single brand
      const brand = args[1];
      console.log(`Searching for: ${brand}`);
      const result = await scraper.searchBrandLogo(brand);
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Search for all brands
      const report = await scraper.processAllBrands();
      console.log(`\n📊 Search complete!`);
      console.log(`Total brands: ${report.totalBrands}`);
      console.log(`Completed: ${report.completed}`);
      console.log(`Pending manual verification: ${report.pending}`);
      console.log(`\n📋 Next step: Run 'node logo_cli.js verify' to start manual verification`);
    }
  }

  async startVerificationServer(args) {
    console.log('🌐 Starting manual verification server...\n');
    
    // Check if verification data exists
    const reportPath = path.join(__dirname, 'logo_verification_report.json');
    if (!fs.existsSync(reportPath)) {
      console.log('⚠️  No verification data found.');
      console.log('💡 Run search first: node logo_cli.js search\n');
      return;
    }

    const server = new LogoVerificationServer();
    server.start();
    
    console.log('🎯 Open your browser and navigate to: http://localhost:3000');
    console.log('📝 Use the web interface to verify and approve logos');
    console.log('⏹️  Press Ctrl+C to stop the server\n');
  }

  async processLogos(args) {
    console.log('⚙️  Starting logo processing...\n');
    
    const processor = new BatchLogoProcessor();
    
    if (args[0] === '--validate-only') {
      console.log('🔍 Validation mode only...');
      const validation = await processor.validateProcessedLogos();
      return;
    }
    
    const report = await processor.processAllLogos();
    
    if (args.includes('--manifest')) {
      await processor.generateLogoManifest();
    }
    
    if (args.includes('--web-optimized')) {
      await processor.createWebOptimizedVersions();
    }
    
    console.log('\n✅ Processing complete!');
    console.log(`📊 Processed: ${report.processed} logos`);
    console.log(`❌ Errors: ${report.errors} logos`);
  }

  async showStatus(args) {
    console.log('📊 System Status\n');
    
    const baseDir = __dirname;
    const dirs = {
      'Raw Images': path.join(baseDir, 'images', 'raw'),
      'Verified Images': path.join(baseDir, 'images', 'verified'),
      'Processed Images': path.join(baseDir, 'images', 'processed')
    };
    
    // Count files in each directory
    Object.entries(dirs).forEach(([name, dir]) => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f));
        console.log(`${name}: ${files.length} files`);
      } else {
        console.log(`${name}: Directory not found`);
      }
    });
    
    // Check for reports
    const reports = [
      'logo_verification_report.json',
      'processing_report.json',
      'logo_manifest.json'
    ];
    
    console.log('\n📋 Reports:');
    reports.forEach(report => {
      const reportPath = path.join(baseDir, report);
      if (fs.existsSync(reportPath)) {
        const stats = fs.statSync(reportPath);
        console.log(`✅ ${report} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
      } else {
        console.log(`❌ ${report} (not found)`);
      }
    });
    
    // Load and show verification progress if available
    const verificationPath = path.join(baseDir, 'logo_verification_report.json');
    if (fs.existsSync(verificationPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(verificationPath, 'utf8'));
        console.log('\n🎯 Verification Progress:');
        console.log(`Total brands: ${data.totalBrands || 0}`);
        console.log(`Completed: ${data.completed || 0}`);
        console.log(`Pending: ${data.pending || 0}`);
        
        if (data.completed > 0) {
          const percentage = Math.round((data.completed / data.totalBrands) * 100);
          console.log(`Progress: ${percentage}%`);
        }
      } catch (error) {
        console.log('⚠️  Could not read verification report');
      }
    }
  }

  async installDependencies(args) {
    console.log('📦 Installing required dependencies...\n');
    
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install'], { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
      
      npm.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Dependencies installed successfully!');
          console.log('🚀 You can now run: node logo_cli.js search');
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }

  async cleanDirectories(args) {
    console.log('🧹 Cleaning directories...\n');
    
    const baseDir = __dirname;
    const dirsToClean = [
      path.join(baseDir, 'images', 'raw'),
      path.join(baseDir, 'images', 'manual_uploads')
    ];
    
    if (args.includes('--all')) {
      dirsToClean.push(
        path.join(baseDir, 'images', 'verified'),
        path.join(baseDir, 'images', 'processed')
      );
    }
    
    let totalCleaned = 0;
    
    dirsToClean.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            totalCleaned++;
          }
        });
        console.log(`🗑️  Cleaned: ${dir} (${files.length} files)`);
      }
    });
    
    console.log(`\n✅ Cleaned ${totalCleaned} files total`);
  }

  async exportLogos(args) {
    console.log('📤 Exporting logos...\n');
    
    const outputFormat = args[0] || 'zip';
    const processor = new BatchLogoProcessor();
    
    if (outputFormat === 'manifest') {
      await processor.generateLogoManifest();
      console.log('✅ Logo manifest generated');
    } else if (outputFormat === 'zip') {
      // Would implement ZIP creation here
      console.log('⚠️  ZIP export not yet implemented');
      console.log('💡 Use --manifest to generate a logo manifest instead');
    } else {
      console.log('❌ Unknown export format. Use: manifest, zip');
    }
  }

  showHelp() {
    console.log(`
🏍️  Motorcycle Logo Acquisition System - Command Reference

SETUP:
  install                 Install required Node.js dependencies
  
LOGO ACQUISITION:
  search                  Search for logos for all motorcycle brands
  search --single <brand> Search for a specific brand logo
  
MANUAL VERIFICATION:
  verify                  Start web server for manual logo verification
  
PROCESSING:
  process                 Process verified logos (convert to PNG, resize)
  process --manifest      Also generate logo manifest
  process --web-optimized Also create web-optimized versions
  process --validate-only Only validate existing processed logos
  
MANAGEMENT:
  status                  Show system status and progress
  clean                   Clean temporary directories
  clean --all            Clean all directories (including processed)
  export manifest        Generate logo manifest file
  
HELP:
  help                   Show this help message

EXAMPLES:
  node logo_cli.js install
  node logo_cli.js search
  node logo_cli.js verify
  node logo_cli.js process --manifest
  node logo_cli.js status

WORKFLOW:
  1. Run 'install' to set up dependencies
  2. Run 'search' to find logo candidates automatically  
  3. Run 'verify' to manually review and approve logos
  4. Run 'process' to generate final PNG files in multiple sizes
  5. Run 'status' to check progress at any time

FILES CREATED:
  - images/raw/           Downloaded logo candidates
  - images/verified/      Manually approved logos  
  - images/processed/     Final PNG files in multiple sizes
  - logo_verification_report.json    Manual verification progress
  - processing_report.json           Processing results
  - logo_manifest.json              Final logo inventory

WEB INTERFACE:
  The verification server runs at http://localhost:3000
  Use it to manually review, approve, and upload logos
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new LogoCLI();
  cli.run().catch(error => {
    console.error('💥 CLI Error:', error.message);
    process.exit(1);
  });
}

module.exports = { LogoCLI };