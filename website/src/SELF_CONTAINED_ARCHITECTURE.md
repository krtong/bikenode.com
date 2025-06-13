# BikeNode Self-Contained Architecture Guide

## CRITICAL: READ THIS BEFORE MAKING ANY CHANGES

This document explains the BikeNode website's self-contained architecture. This is NOT a typical web project with shared components. Understanding this architecture is crucial before making any modifications.

## Core Philosophy: TOTAL SELF-CONTAINMENT, SPECIALIZED NAMING, ZERO OVERLAP

### The Golden Rules:
1. **NOTHING IS SHARED** - Every layout, page, and component is completely self-contained
2. **NO GENERIC NAMES** - Everything must be explicitly named for what it belongs to. Future readers should intuit exactly what this file is, what it does, and who it belongs to.
3. **SELF-CONTAINED LAYOUT FOLDERS** - Zero shared components. If two layouts need similar functionality, copy the code into each layout folder and rename it to be specific to that layout.
4. **COMPLETE ISOLATION** - Changes to one component should NEVER affect another
5. **LOCAL CSS** - All id's and classes are named with hyperspecificity to the document they belong to. CSS files are located inside the page's folder, not in a shared `_includes` folder.

## What This Means in Practice

### ❌ OLD SYSTEM (What NOT to do):
```
_layouts/
├── base.njk                    # Shared base layout
├── main.njk                    # Inherits from base
├── auth.njk                    # Inherits from base
└── docs.njk                    # Inherits from base

_includes/
├── header.njk                  # Shared header
├── footer.njk                  # Shared footer
├── sidebar.njk                 # Shared sidebar
└── background-animation.js     # Shared animation

pages/
├── login.njk                   # Single file
├── dashboard.njk               # Single file
└── profile.njk                 # Single file
```

### ✅ NEW SYSTEM (What TO do):
```
_layouts/
├── bikenode-main-layout-01/
│   ├── index.njk
│   ├── bikenode-main-layout-01-header.njk
│   ├── bikenode-main-layout-01-header.css
│   ├── bikenode-main-layout-01-sidebar.njk
│   ├── bikenode-main-layout-01-sidebar.css
│   ├── bikenode-main-layout-01-footer.njk
│   ├── bikenode-main-layout-01-footer.css
│   ├── bikenode-main-layout-01-background-animation.js
│   └── bikenode-main-layout-01-head.njk
│
├── documentation-page-layout/
│   ├── index.njk
│   ├── documentation-page-layout-header.njk
│   ├── documentation-page-layout-header.css
│   ├── documentation-page-layout-sidebar.njk
│   ├── documentation-page-layout-sidebar.css
│   ├── documentation-page-layout-footer.njk
│   ├── documentation-page-layout-footer.css
│   └── documentation-page-layout-head.njk
│
└── authorization-page-layout/
    ├── index.njk
    ├── authorization-page-layout-header.njk
    ├── authorization-page-layout-footer.njk
    └── authorization-page-layout-styles.css

src/
├── profile/
│   └── profile-my-page/
│       ├── index.njk
│       ├── profile-my-page.css
│       ├── profile-my-page.js
│       ├── profile-my-page-avatar-widget.njk
│       └── images/
│           └── profile-my-page-default-avatar.png
│
└── dashboard-overview/
    └── dashboard-home-page/
        ├── index.njk
        ├── dashboard-home-page.css
        ├── dashboard-home-page-stats-widget.njk
        └── dashboard-home-page-chart.js
```

## Naming Conventions

### EVERY name must include its full context:

#### CSS Classes:
```css
/* ❌ WRONG */
.header { }
.nav-item { }
.active { }

/* ✅ CORRECT */
.bikenode-main-layout-01-header { }
.bikenode-main-layout-01-nav-item { }
.profile-my-page-active-tab { }
```

#### IDs:
```html
<!-- ❌ WRONG -->
<div id="sidebar">
<div id="user-menu">

<!-- ✅ CORRECT -->
<div id="bikenode-main-layout-01-sidebar">
<div id="profile-my-page-user-menu">
```

#### JavaScript Variables/Functions:
```javascript
// ❌ WRONG
function toggleSidebar() { }
const userMenu = document.getElementById('menu');

// ✅ CORRECT
function bikemodeMainLayout01ToggleSidebar() { }
const profileMyPageUserMenu = document.getElementById('profile-my-page-user-menu');
```

#### File Names:
```
❌ WRONG: header.njk, styles.css, utils.js
✅ CORRECT: profile-my-page-header.njk, dashboard-home-page-styles.css, settings-account-page-utils.js
```

## Layout Usage

Pages reference layouts by folder name only:

```yaml
---
layout: bikenode-main-layout-01
title: My Page
---
```

Eleventy automatically finds `_layouts/bikenode-main-layout-01/index.njk`

## The "Inefficiency" is Intentional

Yes, this means:
- Multiple copies of similar code exist
- File sizes are larger
- Updates might need to be made in multiple places

**This is by design because:**
1. **Clarity** - You always know exactly what affects what
2. **Safety** - Changes can't accidentally break unrelated pages
3. **Maintainability** - Each component is completely self-documenting
4. **Flexibility** - Each instance can be customized without affecting others

## Common Mistakes to Avoid

### 1. Creating Shared Components
```javascript
// ❌ NEVER DO THIS
// _includes/shared-header.njk
<header class="shared-header">
```

### 2. Using Generic Names
```css
/* ❌ NEVER DO THIS */
.container { }
.wrapper { }
.content { }
```

### 3. Inheriting Layouts
```yaml
# ❌ NEVER DO THIS
---
layout: base
---
```

### 4. Creating Utility Classes
```css
/* ❌ NEVER DO THIS */
.mt-10 { margin-top: 10px; }
.flex { display: flex; }
```

### 5. Referencing Files Outside Your Component
```javascript
// ❌ NEVER DO THIS
import { utils } from '../../../shared/utils.js';
```

## How to Add a New Page

1. Create a folder with the pattern: `/category/category-page-name/`
2. Create `index.njk` inside
3. Create `category-page-name.css` with all styles prefixed
4. Create `category-page-name.js` if needed
5. Put ALL assets (images, data, components) inside this folder
6. Name EVERYTHING with the full `category-page-name-` prefix

## How to Add a New Layout

1. Create a folder in `_layouts/` with the layout name
2. Create `index.njk` as the main layout file
3. Copy (don't reference) any components you need
4. Rename all copied components with the layout name prefix
5. Update all classes, IDs, and function names to include the layout name

## Global CSS and Shared Libraries

### What happens to global CSS?
Files like `bikenode-global-base-styles.css` and `bikenode-shared-component-library.css` should be:
1. **DELETED** from the global assets folder
2. **COPIED** into each layout that needs those styles
3. **RENAMED** to be layout-specific (e.g., `bikenode-main-layout-01-base-styles.css`)
4. **MODIFIED** to only include styles needed by that specific layout

### Background Animation Handling
The background animation must be copied and renamed for each layout:
- `bikenode-main-layout-01-background-animation.js`
- `documentation-page-layout-background-animation.js`
- `authorization-page-layout-background-animation.js`

Each copy can be customized for its specific layout without affecting others.

## Detailed Asset Organization

### Page Folder Structure
```
/src/profile/
  └── profile-my-page/
      ├── index.njk
      │── profile-my-page-component-avatar-widget.njk
      │── profile-my-page-component-stats-card.njk
      │── profile-my-page-component-activity-feed.njk
      │── profile-my-page-style-main.css
      │── profile-my-page-script-main.js
      │── profile-my-page-script-api.js
      │── profile-my-page-script-interactions.js
      ├── profile-my-page-mock-data/
      │   └── profile-my-page-mock-data-config.json
      └── profile-my-page-images/
          ├── profile-my-page-images-default-avatar.png
          └── profile-my-page-images-achievement-badges.svg
```

## Data Handling and API Endpoints

### API Endpoints Must Follow Naming Convention
```javascript
// ❌ WRONG
fetch('/api/user/profile')
fetch('/api/bikes/list')

// ✅ CORRECT
fetch('/api/profile-my-page/user-data')
fetch('/api/bikes-my-garage/bike-list')
```

### Database Queries
```javascript
// ❌ WRONG
const getUserData = () => { }

// ✅ CORRECT
const profileMyPageGetUserData = () => { }
const bikesMyGarageGetBikeList = () => { }
```

### Mock Data Files
```
❌ WRONG: mockData.json, testData.json
✅ CORRECT: profile-my-page-mock-data.json, bikes-my-garage-test-data.json
```

## Migration Checklist

When migrating existing pages to self-contained architecture:

- [ ] Create proper folder structure `/category/category-page-name/`
- [ ] Move the .njk file to folder as `index.njk`
- [ ] Copy ALL shared dependencies into the folder
- [ ] Rename all classes, IDs, and functions with full prefix
- [ ] Update all internal references to use new names
- [ ] Copy and rename any shared components used
- [ ] Copy and rename any global CSS needed
- [ ] Update layout reference if needed
- [ ] Delete old shared components (after all pages migrated)
- [ ] Test in isolation (see Testing Guidelines)

## Testing Guidelines

### How to Verify True Self-Containment:
1. **Temporarily** rename all other folders (add `.bak` extension)
2. Run only your component/page
3. It should:
   - Render correctly
   - Have all styles applied
   - Have all functionality working
   - Show no console errors
   - Not reference any external files
4. Restore other folders

### Build Process Test:
```bash
# Test individual page build
npm run build -- --input=src/profile/profile-my-page/index.njk
```

## Build Process Implications

### Expected Changes:
- **Bundle sizes**: Larger individual files, but better caching
- **CSS/JS handling**: Each page has its own bundle
- **CSS/JS Organization**: 
  - NO inline CSS - All CSS must be in separate CSS files
  - CSS files should ONLY contain styles for classes/IDs used in .njk files in that same folder
  - ALL class names and IDs must follow the page-specific naming scheme described earlier. 
  - Same goes for Javascript. External files only, no inline scripts, file names must follow the previously described naming scheme. Variables should follow the same naming scheme as well.

### File Loading Strategy:
```html
<!-- Each page loads only its own assets -->
<link rel="stylesheet" href="/assets/css/profile-my-page-styles.css">
<script src="/assets/js/profile-my-page-bundle.js"></script>
```

## Version Control Best Practices

### When Updating Similar Code Across Layouts:
1. **Group commits by feature**, not by layout:
   ```
   ✅ "Update navigation menu styling across all layouts"
   ❌ "Update bikenode-main-layout-01"
   ```

2. **Track updates with a checklist** in PR description:
   ```markdown
   Updated navigation in:
   - [x] bikenode-main-layout-01
   - [x] documentation-page-layout
   - [ ] authorization-page-layout (doesn't have nav)
   ```

3. **Use search/replace carefully** - always verify each change

## What Remains Shared

### These items are exceptions to the self-contained rule:
1. **Favicon files** - `/assets/favicon.ico` (site-wide identity)
2. **Font files** - `/assets/fonts/` (licensing and size considerations)
3. **Third-party libraries** - Only if loaded from CDN
4. **Public assets** - Files served directly without processing

### Everything else must be self-contained!

## Common Integration Patterns

### When Multiple Pages Need Similar Data:
```javascript
// Each page has its own API call
const profileMyPageLoadUserData = async () => {
    const response = await fetch('/api/profile-my-page/user-data');
    // ...
}

const dashboardHomePageLoadUserSummary = async () => {
    const response = await fetch('/api/dashboard-home-page/user-summary');
    // ...
}
```

### When Layouts Need Similar Functionality:
1. Copy the code to each layout
2. Rename everything with the layout prefix
3. Customize as needed
4. No shared utilities!

## The Bottom Line

**When in doubt, ask yourself:**
- Is this completely self-contained?
- Could I delete everything else and this would still work?
- Is every single name unique and descriptive?
- Am I sharing anything with another component?
- Did I avoid assumptions and explored/investigated to ensure everything?
- Did I avoid fake data, placeholders, or mock data that is specific to this page?
- Did I avoid making new file or folder before checking for existing ones that have a slightly different name?
- Does this website work and run?
- Does "npm run dev" build correctly and start the website and api servers?

If any answer is "no", you're doing it wrong.

## Remember

This architecture prioritizes:
1. **Clarity over DRY** (Don't Repeat Yourself)
2. **Isolation over Efficiency**
3. **Explicitness over Convention**
4. **Self-documentation over Comments**

When another developer (or future you) looks at `profile-my-page-avatar-upload-modal.js`, they know EXACTLY what it is, where it belongs, and what it affects without having to trace through any inheritance or shared code.

**THIS IS THE WAY.**