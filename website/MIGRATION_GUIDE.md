# BikeNode 11ty Migration Guide

## Overview

Your BikeNode website has been successfully migrated from static HTML files to **11ty (Eleventy)** - a modern static site generator that provides reusable components while maintaining your existing design and functionality.

## What Changed

### ✅ Benefits
- **Reusable Components**: Sidebar, headers, and other UI elements are now shared across pages
- **Easier Maintenance**: Update navigation once and it applies everywhere
- **Better Organization**: Clean separation of layouts, includes, and content
- **Hot Reload**: Automatic browser refresh during development
- **Modern Workflow**: Industry-standard static site generation

### 📁 New Structure
```
website/
├── src/                    # Source files (edit these)
│   ├── _includes/         # Reusable components
│   │   ├── head.njk
│   │   ├── dashboard-sidebar.njk
│   │   ├── dashboard-header.njk
│   │   └── ...
│   ├── _layouts/          # Page templates
│   │   ├── base.njk       # HTML wrapper
│   │   ├── dashboard.njk  # Dashboard pages
│   │   └── docs.njk       # Documentation pages
│   ├── index.njk          # Homepage
│   ├── dashboard.njk      # Dashboard page
│   └── bot-management.njk # Bot management page
├── _site/                 # Generated files (don't edit)
├── assets/                # Static assets (unchanged)
├── package.json           # Project config
└── .eleventy.js          # 11ty configuration
```

## How to Use

### Development
```bash
# Install dependencies (one time)
npm install

# Start development server with hot reload
npm run dev
# Opens http://localhost:8080

# Build for production
npm run build
```

### Creating New Pages

#### Dashboard Page
Create `src/your-page.njk`:
```yaml
---
layout: dashboard.njk
title: Your Page Title
subtitle: Page description
---

<div class="your-content">
    <!-- Your page content here -->
</div>
```

#### Documentation Page
Create `src/your-docs.njk`:
```yaml
---
layout: docs.njk
title: Documentation Title
subtitle: Page description
---

<div class="your-content">
    <!-- Your documentation content -->
</div>
```

#### With Breadcrumbs
```yaml
---
layout: dashboard.njk
title: Add New Bike
breadcrumb:
  - title: Virtual Garage
    url: /virtual-garage-dashboard/
  - title: Add New Bike
---
```

### Editing Components

#### Update Navigation
Edit `src/_includes/dashboard-sidebar.njk` - changes apply to all dashboard pages automatically.

#### Update Header
Edit `src/_includes/dashboard-header.njk` for dashboard header or `src/_includes/main-header.njk` for main site header.

#### Add Custom Scripts/Styles
In your page frontmatter:
```yaml
---
layout: dashboard.njk
title: Your Page
customCSS:
  - "/assets/css/custom.css"
customJS:
  - "/assets/js/custom.js"
inlineJS: |
  console.log('Custom inline JS');
---
```

## Migration Status

### ✅ Completed
- [x] **11ty Setup**: Project structure and configuration
- [x] **Components Extracted**: Sidebar, headers, navigation
- [x] **Layouts Created**: Base, dashboard, docs, main templates
- [x] **Sample Pages**: Homepage, dashboard, bot management migrated
- [x] **Build Process**: Development and production builds working

### 🔄 Next Steps (Recommended)
1. **Migrate Remaining Pages**: Convert other HTML files to .njk format
2. **Extract More Components**: Common forms, cards, modals
3. **Add Data Files**: Store navigation menus, features in `src/_data/`
4. **Optimize Assets**: Set up image optimization and CSS minification
5. **Add Collections**: Group related pages (blog posts, docs, etc.)

## Converting Existing HTML Files

### Step-by-Step Process

1. **Copy HTML content** (everything inside `<main>` or the main content area)
2. **Create new .njk file** in `src/`
3. **Add frontmatter** (the YAML at the top)
4. **Update links** to use relative paths (already done in your existing files)
5. **Test** with `npm run dev`

### Example Conversion

**Old** (`bot-management.html`):
```html
<!DOCTYPE html>
<html>
<head>...</head>
<body>
    <header>...</header>
    <div class="dashboard-layout">
        <aside>...</aside>
        <main>
            <div class="content-header">
                <h1>Bot Management</h1>
                <p>Configure BikeNode bot settings</p>
            </div>
            <!-- content -->
        </main>
    </div>
</body>
</html>
```

**New** (`src/bot-management.njk`):
```yaml
---
layout: dashboard.njk
title: Bot Management
subtitle: Configure BikeNode bot settings
---

<!-- Just the main content here -->
<div class="bot-content">
    <!-- content -->
</div>
```

## Advanced Features

### Active Navigation States
Navigation automatically highlights the current page using:
```html
{% if page.url.includes('/bot-management') %} active{% endif %}
```

### Conditional Assets
CSS/JS files load automatically based on page type:
- Dashboard pages get `dashboard.css`
- Docs pages get `docs.css`

### Custom Page Variables
Access in templates:
- `{{ title }}` - Page title
- `{{ subtitle }}` - Page subtitle  
- `{{ page.url }}` - Current page URL
- `{{ breadcrumb }}` - Breadcrumb array

## Deployment

### Development
```bash
npm run dev    # http://localhost:8080
```

### Production Build
```bash
npm run build  # Outputs to _site/
```

The `_site/` directory contains your production-ready static files that can be deployed to any static hosting service.

## Troubleshooting

### Common Issues

**Templates not found**: Check file paths in `_includes/` and `_layouts/`

**Styles not loading**: Verify CSS paths start with `/assets/`

**Navigation not updating**: Check the URL matching logic in sidebar components

**Build errors**: Check frontmatter YAML syntax (especially dashes and indentation)

### Getting Help
- 11ty Documentation: https://www.11ty.dev/docs/
- Your existing CSS and JS files work unchanged
- All your current functionality is preserved

## Benefits Realized

1. **DRY Principle**: No more copying navigation across files
2. **Maintainability**: Change sidebar once, updates everywhere
3. **Consistency**: Shared layouts ensure consistent structure
4. **Development Speed**: Hot reload and component reuse
5. **Future-Proof**: Industry standard tooling and practices

Your migration is complete and ready for development! 🎉