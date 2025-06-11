#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class MotorcycleSchemaValidator {
    constructor() {
        this.schema = {
            // Root level required fields
            required: ['manufacturer', 'model', 'url', 'scraped_at'],
            
            // Field definitions with types and validation rules
            fields: {
                manufacturer: { type: 'string', required: true, minLength: 1 },
                model: { type: 'string', required: true, minLength: 1 },
                year: { type: 'number', required: false, min: 1885, max: 2030 },
                url: { type: 'string', required: true, pattern: /^https?:\/\// },
                scraped_at: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}T/ },
                content: { type: 'string', required: false },
                
                specifications: {
                    type: 'object',
                    required: true,
                    fields: {
                        engine: {
                            type: 'object',
                            fields: {
                                type: { type: 'string' },
                                capacity: { type: 'string', pattern: /\d+\s*(cc|CC|cu in|L)/ },
                                bore_stroke: { type: 'string', pattern: /\d+\.?\d*\s*x\s*\d+\.?\d*/ },
                                compression_ratio: { type: 'string', pattern: /\d+\.?\d*:1/ },
                                cooling_system: { type: 'string', enum: ['Air cooled', 'Liquid cooled', 'Oil cooled', 'Air/Oil cooled'] },
                                valves: { type: 'string' },
                                fuel_system: { type: 'string' },
                                ignition: { type: 'string' },
                                starting: { type: 'string', enum: ['Electric', 'Kick', 'Electric & Kick', 'Electric/Kick'] },
                                lubrication: { type: 'string' }
                            }
                        },
                        
                        performance: {
                            type: 'object',
                            fields: {
                                max_power: { type: 'string', pattern: /\d+\.?\d*\s*(kW|hp|PS|CV)/ },
                                max_torque: { type: 'string', pattern: /\d+\.?\d*\s*(Nm|ft-lb|kgf-m)/ },
                                top_speed: { type: 'string', pattern: /\d+\.?\d*\s*(km\/h|mph)/ },
                                fuel_consumption: { type: 'string' },
                                range: { type: 'string' }
                            }
                        },
                        
                        transmission: {
                            type: 'object',
                            fields: {
                                gearbox: { type: 'string', pattern: /\d+\s*Speed|\d+-speed|CVT|Automatic/ },
                                clutch: { type: 'string' },
                                final_drive: { type: 'string', enum: ['Chain', 'Belt', 'Shaft', 'Direct'] },
                                primary_drive: { type: 'string' }
                            }
                        },
                        
                        suspension: {
                            type: 'object',
                            fields: {
                                front: { type: 'string' },
                                rear: { type: 'string' },
                                front_travel: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in)/ },
                                rear_travel: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in)/ }
                            }
                        },
                        
                        brakes: {
                            type: 'object',
                            fields: {
                                front: { type: 'string' },
                                rear: { type: 'string' },
                                abs: { type: 'string' }
                            }
                        },
                        
                        wheels: {
                            type: 'object',
                            fields: {
                                front_tire: { type: 'string', pattern: /\d+\/\d+\s*-?\s*\w+\d+/ },
                                rear_tire: { type: 'string', pattern: /\d+\/\d+\s*-?\s*\w+\d+/ },
                                front_wheel: { type: 'string' },
                                rear_wheel: { type: 'string' }
                            }
                        },
                        
                        dimensions: {
                            type: 'object',
                            fields: {
                                overall_length: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in|cm)/ },
                                overall_width: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in|cm)/ },
                                overall_height: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in|cm)/ },
                                seat_height: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in|cm)/ },
                                wheelbase: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in|cm)/ },
                                ground_clearance: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in|cm)/ },
                                trail: { type: 'string', pattern: /\d+\.?\d*\s*(mm|in)/ },
                                rake: { type: 'string', pattern: /\d+\.?\d*\s*(°|deg|degrees)/ }
                            }
                        },
                        
                        weight: {
                            type: 'object',
                            fields: {
                                wet_weight: { type: 'string', pattern: /\d+\.?\d*\s*(kg|lbs|lb)/ },
                                dry_weight: { type: 'string', pattern: /\d+\.?\d*\s*(kg|lbs|lb)/ },
                                weight_incl_oil: { type: 'string', pattern: /\d+\.?\d*\s*(kg|lbs|lb)/ },
                                payload: { type: 'string', pattern: /\d+\.?\d*\s*(kg|lbs|lb)/ }
                            }
                        },
                        
                        capacity: {
                            type: 'object',
                            fields: {
                                fuel_capacity: { type: 'string', pattern: /\d+\.?\d*\s*(L|Litres|liters|gal|gallons)/ },
                                oil_capacity: { type: 'string', pattern: /\d+\.?\d*\s*(L|Litres|liters|qt|quarts)/ },
                                reserve: { type: 'string', pattern: /\d+\.?\d*\s*(L|Litres|liters|gal)/ }
                            }
                        },
                        
                        electrical: {
                            type: 'object',
                            fields: {
                                alternator: { type: 'string' },
                                battery: { type: 'string' },
                                headlight: { type: 'string' }
                            }
                        },
                        
                        equipment: {
                            type: 'object',
                            fields: {
                                instruments: { type: 'string' },
                                fairing: { type: 'string' },
                                exhaust: { type: 'string' },
                                seat: { type: 'string' },
                                other: { type: 'object' }
                            }
                        }
                    }
                },
                
                images: {
                    type: 'array',
                    required: false,
                    items: {
                        type: 'object',
                        fields: {
                            url: { type: 'string', required: true },
                            alt: { type: 'string' },
                            width: { type: 'number' },
                            height: { type: 'number' }
                        }
                    }
                },
                
                metadata: { type: 'object', required: false }
            }
        };
        
        this.validationErrors = [];
        this.validationWarnings = [];
    }

    validateField(value, fieldDef, fieldPath) {
        if (!fieldDef) return true;
        
        // Check required
        if (fieldDef.required && (value === null || value === undefined || value === '')) {
            this.validationErrors.push(`Missing required field: ${fieldPath}`);
            return false;
        }
        
        if (value === null || value === undefined) return true;
        
        // Check type
        if (fieldDef.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== fieldDef.type) {
                this.validationErrors.push(`Type mismatch at ${fieldPath}: expected ${fieldDef.type}, got ${actualType}`);
                return false;
            }
        }
        
        // String validations
        if (fieldDef.type === 'string') {
            if (fieldDef.minLength && value.length < fieldDef.minLength) {
                this.validationErrors.push(`String too short at ${fieldPath}: minimum length ${fieldDef.minLength}`);
            }
            
            if (fieldDef.pattern && !fieldDef.pattern.test(value)) {
                this.validationWarnings.push(`Pattern mismatch at ${fieldPath}: "${value}" doesn't match expected pattern`);
            }
            
            if (fieldDef.enum && !fieldDef.enum.includes(value)) {
                this.validationWarnings.push(`Invalid enum value at ${fieldPath}: "${value}" not in [${fieldDef.enum.join(', ')}]`);
            }
        }
        
        // Number validations
        if (fieldDef.type === 'number') {
            if (fieldDef.min && value < fieldDef.min) {
                this.validationErrors.push(`Number too small at ${fieldPath}: minimum ${fieldDef.min}`);
            }
            
            if (fieldDef.max && value > fieldDef.max) {
                this.validationErrors.push(`Number too large at ${fieldPath}: maximum ${fieldDef.max}`);
            }
        }
        
        // Object validations
        if (fieldDef.type === 'object' && fieldDef.fields) {
            for (const [subField, subFieldDef] of Object.entries(fieldDef.fields)) {
                this.validateField(value[subField], subFieldDef, `${fieldPath}.${subField}`);
            }
        }
        
        // Array validations
        if (fieldDef.type === 'array' && fieldDef.items && Array.isArray(value)) {
            value.forEach((item, index) => {
                if (fieldDef.items.type === 'object' && fieldDef.items.fields) {
                    for (const [itemField, itemFieldDef] of Object.entries(fieldDef.items.fields)) {
                        this.validateField(item[itemField], itemFieldDef, `${fieldPath}[${index}].${itemField}`);
                    }
                } else {
                    this.validateField(item, fieldDef.items, `${fieldPath}[${index}]`);
                }
            });
        }
        
        return true;
    }

    validate(motorcycle) {
        this.validationErrors = [];
        this.validationWarnings = [];
        
        // Validate each field
        for (const [field, fieldDef] of Object.entries(this.schema.fields)) {
            this.validateField(motorcycle[field], fieldDef, field);
        }
        
        return {
            valid: this.validationErrors.length === 0,
            errors: this.validationErrors,
            warnings: this.validationWarnings
        };
    }

    async validateDataFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            
            const results = {
                file: path.basename(filePath),
                totalRecords: 0,
                validRecords: 0,
                invalidRecords: 0,
                errors: [],
                warnings: [],
                summary: {}
            };
            
            const motorcycles = Array.isArray(data) ? data : data.motorcycles || [];
            results.totalRecords = motorcycles.length;
            
            motorcycles.forEach((motorcycle, index) => {
                const validation = this.validate(motorcycle);
                
                if (validation.valid) {
                    results.validRecords++;
                } else {
                    results.invalidRecords++;
                    results.errors.push({
                        index,
                        manufacturer: motorcycle.manufacturer,
                        model: motorcycle.model,
                        errors: validation.errors
                    });
                }
                
                if (validation.warnings.length > 0) {
                    results.warnings.push({
                        index,
                        manufacturer: motorcycle.manufacturer,
                        model: motorcycle.model,
                        warnings: validation.warnings
                    });
                }
            });
            
            // Generate field coverage summary
            results.summary = this.generateFieldCoverage(motorcycles);
            
            return results;
            
        } catch (error) {
            return {
                file: path.basename(filePath),
                error: error.message
            };
        }
    }

    generateFieldCoverage(motorcycles) {
        const coverage = {};
        
        const countFields = (obj, path = '') => {
            for (const [key, value] of Object.entries(obj || {})) {
                const fieldPath = path ? `${path}.${key}` : key;
                
                if (!coverage[fieldPath]) {
                    coverage[fieldPath] = { count: 0, percentage: 0 };
                }
                
                if (value !== null && value !== undefined && value !== '') {
                    coverage[fieldPath].count++;
                }
                
                if (typeof value === 'object' && !Array.isArray(value)) {
                    countFields(value, fieldPath);
                }
            }
        };
        
        motorcycles.forEach(motorcycle => countFields(motorcycle));
        
        // Calculate percentages
        for (const field of Object.keys(coverage)) {
            coverage[field].percentage = ((coverage[field].count / motorcycles.length) * 100).toFixed(1);
        }
        
        return coverage;
    }

    async generateValidationReport() {
        const dataDir = './scraped_data/motorcycles';
        const files = await fs.readdir(dataDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        console.log('🔍 Validating motorcycle data files...\n');
        
        const allResults = [];
        
        for (const file of jsonFiles) {
            const filePath = path.join(dataDir, file);
            const results = await this.validateDataFile(filePath);
            allResults.push(results);
            
            console.log(`📄 ${results.file}`);
            console.log(`   Total: ${results.totalRecords}, Valid: ${results.validRecords}, Invalid: ${results.invalidRecords}`);
            
            if (results.error) {
                console.log(`   ❌ Error: ${results.error}`);
            }
        }
        
        // Generate comprehensive report
        const report = {
            validatedAt: new Date().toISOString(),
            files: allResults,
            summary: {
                totalFiles: allResults.length,
                totalRecords: allResults.reduce((sum, r) => sum + (r.totalRecords || 0), 0),
                totalValid: allResults.reduce((sum, r) => sum + (r.validRecords || 0), 0),
                totalInvalid: allResults.reduce((sum, r) => sum + (r.invalidRecords || 0), 0)
            }
        };
        
        await fs.writeFile('./scraped_data/validation_report.json', JSON.stringify(report, null, 2));
        console.log('\n✅ Validation report saved to ./scraped_data/validation_report.json');
        
        return report;
    }
}

// Run validation
if (require.main === module) {
    const validator = new MotorcycleSchemaValidator();
    validator.generateValidationReport();
}

module.exports = MotorcycleSchemaValidator;