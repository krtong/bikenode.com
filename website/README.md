# BikeNode Website

> **⚠️ CRITICAL: Read Before ANY Development**
> 
> **MANDATORY READING BEFORE PROCEEDING:**
> 1. [README_BEFORE_MAKING_ANY_PAGE.md](src/README_BEFORE_MAKING_ANY_PAGE.md)
> 2. [SELF_CONTAINED_ARCHITECTURE.md](src/SELF_CONTAINED_ARCHITECTURE.md)
> 
> **ABSOLUTE RULES:**
> - **NO PLACEHOLDERS** - No mock data, no "coming soon", no Lorem ipsum
> - **CHECK BEFORE CREATING** - Always search for existing files with similar names
> - **VERIFY LINKS** - Never link to a page without confirming it exists
> - **HYPERSPECIFIC NAMES** - No generic names like "styles.css" or "utils.js"
> - **SELF-CONTAINED** - Each page in its own folder with ALL its assets

A modern static website built with 11ty (Eleventy) for the BikeNode platform - connecting bike enthusiasts through virtual garages, communities, and Discord integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens http://localhost:8080 with hot reload

# Build for production
npm run build
```

## 📁 Project Structure

```
website/
├── src/                    # Source files
│   ├── _includes/         # Reusable components
│   │   ├── head.njk
│   │   ├── dashboard-sidebar.njk
│   │   ├── dashboard-header.njk
│   │   ├── main-header.njk
│   │   ├── docs-sidebar.njk
│   │   └── scripts.njk
│   ├── _layouts/          # Page templates
│   │   ├── base.njk       # HTML wrapper
│   │   ├── dashboard.njk  # Dashboard pages
│   │   ├── docs.njk       # Documentation
│   │   └── main.njk       # Main site pages
│   ├── index.njk          # Homepage
│   ├── dashboard.njk      # Main dashboard
│   └── bot-management.njk # Bot management
├── _site/                 # Generated output (don't edit)
├── assets/                # Static assets
│   ├── css/
│   ├── js/
│   └── images/
├── package.json
└── .eleventy.js          # 11ty configuration
```

## 🛠 Development

### Creating New Pages

#### Dashboard Page
```yaml
---
layout: dashboard.njk
title: Page Title
subtitle: Page description
---

<div class="page-content">
    <!-- Your content -->
</div>
```

#### Documentation Page
```yaml
---
layout: docs.njk
title: Doc Title
subtitle: Description
---

<div class="docs-content">
    <!-- Your documentation -->
</div>
```

#### With Custom Assets
```yaml
---
layout: dashboard.njk
title: Custom Page
customCSS:
  - "/assets/css/custom.css"
customJS:
  - "/assets/js/custom.js"
inlineJS: |
  console.log('Custom JavaScript');
---
```

### Component System

#### Shared Navigation
- **Dashboard Sidebar**: `src/_includes/dashboard-sidebar.njk`
- **Main Header**: `src/_includes/main-header.njk`
- **Docs Sidebar**: `src/_includes/docs-sidebar.njk`

Navigation automatically highlights active pages based on URL matching.

#### Layouts
- **Base Layout**: `src/_layouts/base.njk` - HTML wrapper
- **Dashboard Layout**: `src/_layouts/dashboard.njk` - Dashboard pages with sidebar
- **Docs Layout**: `src/_layouts/docs.njk` - Documentation pages
- **Main Layout**: `src/_layouts/main.njk` - Main site pages

### Available Variables
- `{{ title }}` - Page title
- `{{ subtitle }}` - Page subtitle
- `{{ page.url }}` - Current page URL
- `{{ breadcrumb }}` - Navigation breadcrumbs

## 🎨 Features

### Auto-Loading Assets
- Dashboard pages automatically load `dashboard.css`
- Documentation pages load `docs.css`
- All pages load `index.css` and `background.js`

### Navigation States
Active page highlighting works automatically:
```html
<a href="/dashboard/" class="nav-link{% if page.url == '/dashboard/' %} active{% endif %}">
```

### Breadcrumbs
Add navigation breadcrumbs to any page:
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

## 📦 Build & Deploy

### Development
```bash
npm run dev     # Development server with hot reload
npm run build   # Production build
npm run clean   # Clean output directory
```

### Production
The `_site/` directory contains production-ready static files that can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

## 🔧 Configuration

### 11ty Configuration
See `.eleventy.js` for:
- Static file copying
- Template engine settings
- Directory structure
- Output formats

### Package Scripts
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run serve` - Serve built files
- `npm run clean` - Clean output

## 📄 Pages

### Migrated Pages
- ✅ Homepage (`src/index.njk`)
- ✅ Dashboard (`src/dashboard.njk`)
- ✅ Bot Management (`src/bot-management.njk`)
- ✅ Virtual Garage Dashboard (`src/virtual-garage-dashboard.njk`)
- ✅ Add Bike (`src/add-bike.njk`)
- ✅ Account Settings (`src/account-settings.njk`)
- ✅ Notification Settings (`src/notification-settings.njk`)
- ✅ Admin Dashboard (`src/admin-dashboard.njk`)
- ✅ Analytics Dashboard (`src/analytics-dashboard.njk`)
- ✅ Mock Login (`src/mock-login.njk`)
- ✅ Mock Signup (`src/mock-signup.njk`)
- ✅ Features (`src/features.njk`)

### To Be Migrated
- 🔄 Discord Dashboard
- 🔄 Communities Dashboard
- 🔄 About, Blog, Contact pages
- 🔄 Other documentation pages

## 🌟 Benefits

1. **Reusable Components**: Update navigation once, applies everywhere
2. **Hot Reload**: Instant preview of changes
3. **Modern Workflow**: Industry-standard static site generation
4. **Easy Maintenance**: Shared layouts and includes
5. **Consistent Structure**: Templates ensure consistency
6. **Fast Development**: Component-based approach

## 📚 Resources

- [11ty Documentation](https://www.11ty.dev/docs/)
- [Nunjucks Template Language](https://mozilla.github.io/nunjucks/)
- [Migration Guide](./MIGRATION_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make changes in `src/` directory
4. Test with `npm run dev`
5. Build with `npm run build`
6. Submit a pull request

## 📝 License

This project is part of the BikeNode platform.