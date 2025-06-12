#!/usr/bin/env node
/**
 * Bicycle Brands Data Exporter
 * Export bicycle brands data to various formats (CSV, JSON, SQL, XML)
 */

const fs = require('fs');
const path = require('path');

// Load the brands data
let brandinfo;
try {
    brandinfo = require('./bicycle_brands_cleaned.js');
    console.log('📦 Loaded cleaned bicycle brands data');
} catch (e) {
    brandinfo = require('./bicycle_brands.js');
    console.log('📦 Loaded original bicycle brands data');
}

class BrandExporter {
    constructor(brands) {
        this.brands = brands;
    }

    exportToCSV() {
        const headers = [
            'brand_id', 'brand_name', 'website', 'description', 'founding_year',
            'founding_country', 'headquarters_country', 'industry', 'industry_subcategory',
            'famous_models', 'logo_url', 'icon_url', 'facebook', 'instagram', 'twitter',
            'linkedin', 'founders', 'parent_company', 'employee_count', 'annual_revenue'
        ];

        let csv = headers.join(',') + '\n';

        this.brands.forEach(brand => {
            const row = [
                this.escapeCSV(brand.brand_id),
                this.escapeCSV(brand.brand_name),
                this.escapeCSV(brand.website),
                this.escapeCSV(brand.description),
                brand.founding?.year || '',
                this.escapeCSV(brand.founding?.location?.country),
                this.escapeCSV(brand.headquarters?.country),
                this.escapeCSV(brand.industry),
                this.escapeCSV(brand.industry_subcategory),
                this.escapeCSV(brand.famous_models?.join('; ')),
                this.escapeCSV(brand.logo?.logo_url),
                this.escapeCSV(brand.logo?.icon_url),
                this.escapeCSV(brand.social_media?.facebook),
                this.escapeCSV(brand.social_media?.instagram),
                this.escapeCSV(brand.social_media?.twitter),
                this.escapeCSV(brand.social_media?.linkedin),
                this.escapeCSV(brand.founders?.join('; ')),
                this.escapeCSV(brand.parent_company),
                brand.employee_headcount?.number || '',
                brand.annual_revenue?.amount || ''
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    escapeCSV(value) {
        if (!value) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    exportToSQL() {
        let sql = `-- Bicycle Brands Database Export
-- Generated on ${new Date().toISOString()}
-- Total brands: ${this.brands.length}

DROP TABLE IF EXISTS bicycle_brands;

CREATE TABLE bicycle_brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id TEXT UNIQUE NOT NULL,
    brand_name TEXT NOT NULL,
    website TEXT,
    description TEXT,
    founding_year INTEGER,
    founding_country TEXT,
    headquarters_country TEXT,
    industry TEXT,
    industry_subcategory TEXT,
    famous_models TEXT,
    logo_url TEXT,
    icon_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    linkedin_url TEXT,
    founders TEXT,
    parent_company TEXT,
    employee_count INTEGER,
    annual_revenue INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

`;

        this.brands.forEach(brand => {
            const values = [
                this.escapeSQL(brand.brand_id),
                this.escapeSQL(brand.brand_name),
                this.escapeSQL(brand.website),
                this.escapeSQL(brand.description),
                brand.founding?.year || 'NULL',
                this.escapeSQL(brand.founding?.location?.country),
                this.escapeSQL(brand.headquarters?.country),
                this.escapeSQL(brand.industry),
                this.escapeSQL(brand.industry_subcategory),
                this.escapeSQL(brand.famous_models?.join('; ')),
                this.escapeSQL(brand.logo?.logo_url),
                this.escapeSQL(brand.logo?.icon_url),
                this.escapeSQL(brand.social_media?.facebook),
                this.escapeSQL(brand.social_media?.instagram),
                this.escapeSQL(brand.social_media?.twitter),
                this.escapeSQL(brand.social_media?.linkedin),
                this.escapeSQL(brand.founders?.join('; ')),
                this.escapeSQL(brand.parent_company),
                brand.employee_headcount?.number || 'NULL',
                brand.annual_revenue?.amount || 'NULL'
            ];

            sql += `INSERT INTO bicycle_brands (
    brand_id, brand_name, website, description, founding_year,
    founding_country, headquarters_country, industry, industry_subcategory,
    famous_models, logo_url, icon_url, facebook_url, instagram_url,
    twitter_url, linkedin_url, founders, parent_company,
    employee_count, annual_revenue
) VALUES (${values.join(', ')});

`;
        });

        sql += `
-- Create indexes for better performance
CREATE INDEX idx_bicycle_brands_country ON bicycle_brands(headquarters_country);
CREATE INDEX idx_bicycle_brands_founding_year ON bicycle_brands(founding_year);
CREATE INDEX idx_bicycle_brands_industry ON bicycle_brands(industry_subcategory);
CREATE INDEX idx_bicycle_brands_name ON bicycle_brands(brand_name);

-- Summary statistics
SELECT 
    COUNT(*) as total_brands,
    COUNT(DISTINCT headquarters_country) as countries_covered,
    MIN(founding_year) as oldest_brand_year,
    MAX(founding_year) as newest_brand_year,
    ROUND(AVG(founding_year)) as avg_founding_year
FROM bicycle_brands 
WHERE founding_year IS NOT NULL;
`;

        return sql;
    }

    escapeSQL(value) {
        if (!value) return 'NULL';
        return `'${String(value).replace(/'/g, "''")}'`;
    }

    exportToXML() {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bicycle_brands generated="${new Date().toISOString()}" total="${this.brands.length}">
`;

        this.brands.forEach(brand => {
            xml += `  <brand id="${this.escapeXML(brand.brand_id)}">
    <name>${this.escapeXML(brand.brand_name)}</name>
    <website>${this.escapeXML(brand.website)}</website>
    <description><![CDATA[${brand.description || ''}]]></description>
    
    <founding>
      <year>${brand.founding?.year || ''}</year>
      <country>${this.escapeXML(brand.founding?.location?.country)}</country>
      <city>${this.escapeXML(brand.founding?.location?.city)}</city>
    </founding>
    
    <headquarters>
      <country>${this.escapeXML(brand.headquarters?.country)}</country>
      <city>${this.escapeXML(brand.headquarters?.city)}</city>
    </headquarters>
    
    <industry>
      <category>${this.escapeXML(brand.industry)}</category>
      <subcategory>${this.escapeXML(brand.industry_subcategory)}</subcategory>
    </industry>
    
    <models>
`;
            if (brand.famous_models) {
                brand.famous_models.forEach(model => {
                    xml += `      <model>${this.escapeXML(model)}</model>\n`;
                });
            }
            xml += `    </models>
    
    <branding>
      <logo_url>${this.escapeXML(brand.logo?.logo_url)}</logo_url>
      <icon_url>${this.escapeXML(brand.logo?.icon_url)}</icon_url>
    </branding>
    
    <social_media>
      <facebook>${this.escapeXML(brand.social_media?.facebook)}</facebook>
      <instagram>${this.escapeXML(brand.social_media?.instagram)}</instagram>
      <twitter>${this.escapeXML(brand.social_media?.twitter)}</twitter>
      <linkedin>${this.escapeXML(brand.social_media?.linkedin)}</linkedin>
    </social_media>
    
    <founders>
`;
            if (brand.founders) {
                brand.founders.forEach(founder => {
                    xml += `      <founder>${this.escapeXML(founder)}</founder>\n`;
                });
            }
            xml += `    </founders>
  </brand>
`;
        });

        xml += '</bicycle_brands>';
        return xml;
    }

    escapeXML(value) {
        if (!value) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    exportToMarkdown() {
        let md = `# Bicycle Brands Database

Generated on: ${new Date().toISOString()}  
Total Brands: ${this.brands.length}

## Summary Statistics

`;

        // Generate summary
        const countries = {};
        const industries = {};
        const foundingYears = [];

        this.brands.forEach(brand => {
            const country = brand.headquarters?.country;
            if (country) countries[country] = (countries[country] || 0) + 1;
            
            const industry = brand.industry_subcategory;
            if (industry) industries[industry] = (industries[industry] || 0) + 1;
            
            const year = brand.founding?.year;
            if (year && year > 1800) foundingYears.push(year);
        });

        md += `### Geographic Distribution
| Country | Brand Count |
|---------|-------------|
`;
        Object.entries(countries)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([country, count]) => {
                md += `| ${country} | ${count} |\n`;
            });

        md += `
### Industry Categories
| Category | Brand Count |
|----------|-------------|
`;
        Object.entries(industries)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([industry, count]) => {
                md += `| ${industry} | ${count} |\n`;
            });

        if (foundingYears.length > 0) {
            md += `
### Historical Data
- **Oldest Brand**: ${Math.min(...foundingYears)}
- **Newest Brand**: ${Math.max(...foundingYears)}
- **Average Founding Year**: ${Math.round(foundingYears.reduce((a, b) => a + b, 0) / foundingYears.length)}
- **Brands with Founding Data**: ${foundingYears.length}/${this.brands.length}

`;
        }

        md += `## Complete Brand Listing

| Brand | Country | Founded | Website | Specialization |
|-------|---------|---------|---------|----------------|
`;

        this.brands.forEach(brand => {
            md += `| [${brand.brand_name}](${brand.website || '#'}) | ${brand.headquarters?.country || 'Unknown'} | ${brand.founding?.year || 'Unknown'} | ${brand.website ? '✅' : '❌'} | ${brand.industry_subcategory || 'General'} |\n`;
        });

        return md;
    }

    exportFilteredData(filters) {
        let filtered = [...this.brands];

        if (filters.country) {
            filtered = filtered.filter(brand => 
                brand.headquarters?.country?.toLowerCase().includes(filters.country.toLowerCase())
            );
        }

        if (filters.industry) {
            filtered = filtered.filter(brand => 
                brand.industry_subcategory?.toLowerCase().includes(filters.industry.toLowerCase())
            );
        }

        if (filters.foundedAfter) {
            filtered = filtered.filter(brand => 
                brand.founding?.year && brand.founding.year >= filters.foundedAfter
            );
        }

        if (filters.foundedBefore) {
            filtered = filtered.filter(brand => 
                brand.founding?.year && brand.founding.year <= filters.foundedBefore
            );
        }

        return filtered;
    }

    exportAll(outputDir = 'exports') {
        // Create output directory
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const exports = {};

        // Export CSV
        const csvContent = this.exportToCSV();
        const csvFile = path.join(outputDir, `bicycle_brands_${timestamp}.csv`);
        fs.writeFileSync(csvFile, csvContent);
        exports.csv = csvFile;

        // Export SQL
        const sqlContent = this.exportToSQL();
        const sqlFile = path.join(outputDir, `bicycle_brands_${timestamp}.sql`);
        fs.writeFileSync(sqlFile, sqlContent);
        exports.sql = sqlFile;

        // Export JSON (formatted)
        const jsonContent = JSON.stringify(this.brands, null, 2);
        const jsonFile = path.join(outputDir, `bicycle_brands_${timestamp}.json`);
        fs.writeFileSync(jsonFile, jsonContent);
        exports.json = jsonFile;

        // Export XML
        const xmlContent = this.exportToXML();
        const xmlFile = path.join(outputDir, `bicycle_brands_${timestamp}.xml`);
        fs.writeFileSync(xmlFile, xmlContent);
        exports.xml = xmlFile;

        // Export Markdown
        const mdContent = this.exportToMarkdown();
        const mdFile = path.join(outputDir, `bicycle_brands_${timestamp}.md`);
        fs.writeFileSync(mdFile, mdContent);
        exports.markdown = mdFile;

        // Export filtered datasets
        const usaBrands = this.exportFilteredData({ country: 'USA' });
        const usaJsonFile = path.join(outputDir, `bicycle_brands_usa_${timestamp}.json`);
        fs.writeFileSync(usaJsonFile, JSON.stringify(usaBrands, null, 2));
        exports.usa_brands = usaJsonFile;

        const electricBrands = this.exportFilteredData({ industry: 'electric' });
        const electricJsonFile = path.join(outputDir, `bicycle_brands_electric_${timestamp}.json`);
        fs.writeFileSync(electricJsonFile, JSON.stringify(electricBrands, null, 2));
        exports.electric_brands = electricJsonFile;

        return exports;
    }

    generateReport(exports) {
        const report = {
            timestamp: new Date().toISOString(),
            total_brands: this.brands.length,
            exports: exports,
            summary: {
                countries: new Set(this.brands.map(b => b.headquarters?.country).filter(Boolean)).size,
                industries: new Set(this.brands.map(b => b.industry_subcategory).filter(Boolean)).size,
                with_websites: this.brands.filter(b => b.website).length,
                with_social_media: this.brands.filter(b => b.social_media?.instagram || b.social_media?.facebook).length
            }
        };

        const reportFile = path.join(path.dirname(Object.values(exports)[0]), `export_report_${new Date().toISOString().split('T')[0]}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        return report;
    }
}

// CLI interface
if (require.main === module) {
    const exporter = new BrandExporter(brandinfo);
    
    const args = process.argv.slice(2);
    const format = args[0];
    const outputDir = args[1] || 'exports';

    if (format === 'all') {
        console.log('🚀 Exporting all formats...');
        const exports = exporter.exportAll(outputDir);
        const report = exporter.generateReport(exports);
        
        console.log('\n✅ Export complete!');
        console.log(`📁 Output directory: ${outputDir}`);
        console.log('\n📄 Generated files:');
        Object.entries(exports).forEach(([format, file]) => {
            console.log(`  ${format.toUpperCase()}: ${file}`);
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`  Total brands: ${report.total_brands}`);
        console.log(`  Countries: ${report.summary.countries}`);
        console.log(`  Industries: ${report.summary.industries}`);
        console.log(`  With websites: ${report.summary.with_websites}`);
        console.log(`  With social media: ${report.summary.with_social_media}`);
        
    } else if (format) {
        console.log(`🚀 Exporting ${format.toUpperCase()} format...`);
        
        let content, filename;
        const timestamp = new Date().toISOString().split('T')[0];
        
        switch (format.toLowerCase()) {
            case 'csv':
                content = exporter.exportToCSV();
                filename = `bicycle_brands_${timestamp}.csv`;
                break;
            case 'sql':
                content = exporter.exportToSQL();
                filename = `bicycle_brands_${timestamp}.sql`;
                break;
            case 'xml':
                content = exporter.exportToXML();
                filename = `bicycle_brands_${timestamp}.xml`;
                break;
            case 'markdown':
            case 'md':
                content = exporter.exportToMarkdown();
                filename = `bicycle_brands_${timestamp}.md`;
                break;
            default:
                console.log('❌ Unknown format. Available: csv, sql, xml, markdown, all');
                process.exit(1);
        }
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, content);
        console.log(`✅ Exported to: ${filepath}`);
        
    } else {
        console.log('🚴 Bicycle Brands Exporter');
        console.log('\nUsage:');
        console.log('  node bicycle_brands_exporter.js <format> [output_dir]');
        console.log('\nFormats:');
        console.log('  csv      - Comma-separated values');
        console.log('  sql      - SQLite database script');
        console.log('  xml      - XML format');
        console.log('  markdown - Markdown documentation');
        console.log('  all      - Export all formats');
        console.log('\nExamples:');
        console.log('  node bicycle_brands_exporter.js csv');
        console.log('  node bicycle_brands_exporter.js all exports/');
    }
}

module.exports = BrandExporter;