import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class DataDeduplicator {
    constructor(dataDirectory) {
        this.dataDir = dataDirectory;
        this.uniqueProducts = new Map();
        this.duplicates = [];
    }

    generateProductHash(product) {
        // Create a unique hash based on key product attributes
        const hashData = {
            brand: (product.brand || '').toLowerCase().trim(),
            name: (product.name || '').toLowerCase().trim(),
            sku: (product.sku || '').toLowerCase().trim()
        };
        
        const hashString = JSON.stringify(hashData);
        return crypto.createHash('md5').update(hashString).digest('hex');
    }

    async loadDataFiles() {
        const files = await fs.readdir(this.dataDir);
        const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('deduplicated'));
        
        const allProducts = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(this.dataDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);
                
                if (Array.isArray(data)) {
                    data.forEach(product => {
                        allProducts.push({
                            ...product,
                            _sourceFile: file
                        });
                    });
                } else if (data && typeof data === 'object') {
                    allProducts.push({
                        ...data,
                        _sourceFile: file
                    });
                }
            } catch (error) {
                console.error(`Error reading file ${file}:`, error.message);
            }
        }
        
        return allProducts;
    }

    findDuplicates(products) {
        const stats = {
            totalProducts: products.length,
            uniqueProducts: 0,
            duplicates: 0,
            duplicateGroups: []
        };
        
        for (const product of products) {
            const hash = this.generateProductHash(product);
            
            if (this.uniqueProducts.has(hash)) {
                // Found duplicate
                const existing = this.uniqueProducts.get(hash);
                this.duplicates.push({
                    hash,
                    product,
                    duplicateOf: existing
                });
                stats.duplicates++;
                
                // Track duplicate groups
                let group = stats.duplicateGroups.find(g => g.hash === hash);
                if (!group) {
                    group = {
                        hash,
                        products: [existing],
                        count: 2
                    };
                    stats.duplicateGroups.push(group);
                } else {
                    group.count++;
                }
                group.products.push(product);
            } else {
                // Unique product
                this.uniqueProducts.set(hash, product);
                stats.uniqueProducts++;
            }
        }
        
        return stats;
    }

    async deduplicate(options = {}) {
        const {
            dryRun = false,
            backupOriginal = true,
            outputFile = null
        } = options;
        
        console.log('Loading data files...');
        const allProducts = await this.loadDataFiles();
        
        console.log(`Found ${allProducts.length} total products`);
        
        // Find duplicates
        const stats = this.findDuplicates(allProducts);
        
        console.log(`Unique products: ${stats.uniqueProducts}`);
        console.log(`Duplicates found: ${stats.duplicates}`);
        
        if (dryRun) {
            console.log('Dry run mode - no files will be modified');
            
            // Generate duplicate report
            const reportPath = path.join(this.dataDir, 'duplicate_report.json');
            await fs.writeFile(reportPath, JSON.stringify({
                stats,
                duplicateGroups: stats.duplicateGroups.map(group => ({
                    hash: group.hash,
                    count: group.count,
                    example: {
                        brand: group.products[0].brand,
                        name: group.products[0].name,
                        sku: group.products[0].sku
                    },
                    sources: group.products.map(p => p._sourceFile)
                }))
            }, null, 2));
            
            console.log(`Duplicate report saved to: ${reportPath}`);
        } else {
            // Create deduplicated dataset
            const uniqueProductsArray = Array.from(this.uniqueProducts.values());
            
            // Remove internal tracking fields
            uniqueProductsArray.forEach(product => {
                delete product._sourceFile;
            });
            
            const timestamp = new Date().toISOString().split('T')[0];
            const outputPath = outputFile || path.join(this.dataDir, `deduplicated_products_${timestamp}.json`);
            
            // Backup original files if requested
            if (backupOriginal) {
                const backupDir = path.join(this.dataDir, 'backup', timestamp);
                await fs.mkdir(backupDir, { recursive: true });
                
                const files = await fs.readdir(this.dataDir);
                for (const file of files) {
                    if (file.endsWith('.json') && !file.includes('deduplicated')) {
                        await fs.copyFile(
                            path.join(this.dataDir, file),
                            path.join(backupDir, file)
                        );
                    }
                }
                console.log(`Original files backed up to: ${backupDir}`);
            }
            
            // Save deduplicated data
            await fs.writeFile(outputPath, JSON.stringify(uniqueProductsArray, null, 2));
            console.log(`Deduplicated data saved to: ${outputPath}`);
            
            // Save deduplication summary
            const summaryPath = path.join(this.dataDir, `deduplication_summary_${timestamp}.json`);
            await fs.writeFile(summaryPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                stats,
                outputFile: outputPath,
                backupLocation: backupOriginal ? path.join('backup', timestamp) : null
            }, null, 2));
        }
        
        return stats;
    }

    async mergeDatasets(datasets) {
        // Merge multiple datasets while removing duplicates
        const allProducts = [];
        
        for (const dataset of datasets) {
            const data = JSON.parse(await fs.readFile(dataset, 'utf-8'));
            if (Array.isArray(data)) {
                allProducts.push(...data);
            }
        }
        
        // Reset state
        this.uniqueProducts.clear();
        this.duplicates = [];
        
        // Find duplicates across all datasets
        const stats = this.findDuplicates(allProducts);
        
        return {
            stats,
            mergedData: Array.from(this.uniqueProducts.values())
        };
    }
}

export default DataDeduplicator;