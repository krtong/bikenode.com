# BikeNode Website Layout Reorganization Plan

## Background & Current Issues

The BikeNode website is experiencing routing and CSS issues due to a mismatch between:
1. **Folder Structure**: Pages are organized with prefixed folder names (e.g., `auth-login-page`, `docs-features-guide`)
2. **Internal Links**: Templates have hardcoded links expecting clean URLs (e.g., `/login/`, `/features/`)
3. **Eleventy Configuration**: The permalink logic strips category prefixes for hyphenated names, generating URLs like `/auth-login-page/` instead of `/login/`

### Key Problems:
- Homepage CSS is broken (references non-existent `/assets/css/front-page.css`)
- Navigation links return 404 errors (e.g., `/login/` doesn't exist, actual URL is `/auth-login-page/`)
- Layout files are disorganized in a flat structure

## Solution Strategy

**DO NOT** change the Eleventy permalink configuration or move pages to different folders.
**DO** update all internal links to match the actual generated URLs based on folder names.

## Important Rules

1. **DO NOT MOVE OR CREATE FILES** unless explicitly listed in the tasks below
2. **DO NOT** create clean URL mappings - use the existing folder structure URLs
3. **ALWAYS** use the folder-based URLs (e.g., `/auth-login-page/` not `/login/`)
4. **PRESERVE** the existing folder structure as defined in `README_BEFORE_MAKING_ANY_PAGE.md`

## Current Layout Structure

```
_layouts/
├── auth.njk                    # Authorization pages layout
├── base.njk                    # Base layout all others inherit from
├── bikenode-main-layout-01.njk # Main dashboard/app layout
├── docs.njk                    # Documentation pages layout
├── main.njk                    # Front page layout
└── base-with-ab-test.njk      # Unused, can be deleted
```

## Proposed Layout Structure

```
_layouts/
├── global-layout-inheritances/
│   └── base-layout.njk         # Base layout (renamed from base.njk)
│
├── shared-components/
│   ├── headers/
│   │   └── main-header.njk     # Shared by front-page and docs
│   ├── sidebars/
│   │   └── docs-sidebar.njk    # Documentation sidebar
│   └── footers/
│       └── main-footer.njk     # Main footer (renamed from footer.njk)
│
├── front-page-layout/
│   └── front-page-layout.njk   # Homepage layout (renamed from main.njk)
│
├── documentation-page-layout/
│   └── documentation-page-layout.njk  # Docs layout (renamed from docs.njk)
│
├── authorization-page-layout/
│   └── authorization-page-layout.njk  # Auth layout (renamed from auth.njk)
│
└── bikenode-main-layout-01/
    ├── bikenode-main-layout-01.njk
    └── components/
        ├── header/
        │   ├── bikenode-main-layout-01-header.njk
        │   └── bikenode-main-layout-01-header.css
        └── sidebar/
            ├── bikenode-main-layout-01-sidebar.njk
            └── bikenode-main-layout-01-sidebar.css
```

## URL Mapping Reference

Update all internal links according to this mapping:

### Authentication
- `/login/` → `/auth-login-page/`
- `/signup/` → `/auth-signup-page/`
- `/forgot-password/` → `/auth-forgot-password/`
- `/verify-email/` → `/auth-verify-email/`

### Documentation
- `/features/` → `/docs-features-guide/`
- `/about/` → `/docs-about-bikenode/`
- `/contact/` → `/docs-contact-page/`
- `/careers/` → `/docs-careers-page/`
- `/advocacy/` → `/docs-advocacy-page/`
- `/privacy/` → `/docs-privacy-policy/`
- `/terms/` → `/docs-terms-service/`
- `/support/` → `/docs-support-center/`
- `/api/` → `/docs-api-reference/`

### Marketplace
- `/marketplace/` → `/marketplace-browse-listings/`
- `/sell/` → `/marketplace-create-listing/`
- `/my-listings/` → `/marketplace-my-listings/`

### Dashboard/Profile
- `/dashboard/` → `/dashboard-home-page/`
- `/profile/` → `/profile-my-page/`
- `/settings/` → `/settings-account/`
- `/achievements/` → `/profile-achievements-list/`

### Other
- `/communities/` → `/communities-dashboard/`
- `/events/` → `/events-browse-list/`
- `/rides/` → `/rides-my-dashboard/`
- `/bikes/` → `/bikes-my-garage/`
- `/gear/` → `/gear-my-collection/`

## Todo List with Detailed Instructions

### Phase 1: Fix Immediate Issues (High Priority)

#### 1. Fix homepage CSS reference ✅ COMPLETED
**File**: `src/front-page/index.njk`
**Change**: `/assets/css/front-page.css` → `/assets/css/bikenode-homepage-landing-styles.css`
**Why**: The front-page.css file doesn't exist; the actual CSS file is bikenode-homepage-landing-styles.css
**Status**: Updated successfully

#### 2. Update homepage links ✅ COMPLETED
**File**: `src/front-page/index.njk`
**Changes**:
- `/signup/` → `/auth-signup-page/`
- `/features/` → `/docs-features-guide/`
**Status**: Both hero buttons and CTA section updated

#### 3. Update main header links (affects homepage) ✅ COMPLETED
**File**: `src/_includes/main-header.njk`
**Changes**:
- `/login/` → `/auth-login-page/`
- `/signup/` → `/auth-signup-page/`
- `/features/` → `/docs-features-guide/`
- `/marketplace/` → `/marketplace-browse-listings/`
- `/events/` → `/events-my-list/`
- `/community/` → `/communities-dashboard/`
- `/advocacy/` → `/docs-advocacy-page/`
- `/search/` → `/front-page-search-feature/`
**Status**: All 8 links updated

#### 4. Update footer links (affects homepage) ✅ COMPLETED
**File**: `src/_includes/footer.njk`
**Check for and update**: Any links to docs pages, auth pages, etc.
**Status**: Updated 18 links total covering all sections (Platform, Products, Company, Support)

#### 5. Update bikenode-main-layout-01 header (affects most pages) ✅ COMPLETED
**File**: `src/_includes/bikenode-main-layout-01/header/bikenode-main-layout-01-header.njk`
**Update**: All navigation links to match folder structure
**Status**: Updated dashboard, discord, and account settings links

#### 6. Update bikenode-main-layout-01 sidebar (affects most pages) ✅ COMPLETED
**File**: `src/_includes/bikenode-main-layout-01/sidebar/bikenode-main-layout-01-sidebar.njk`
**Update**: All navigation links to match folder structure
**Status**: Updated community and settings section links

#### 23. Update auth layout links ✅ COMPLETED
**File**: `src/_layouts/auth.njk`
**Changes**:
- `/terms/` → `/docs-terms-service/`
- `/privacy/` → `/docs-privacy-policy/`
- `/support/` → `/docs-support-center/`
**Status**: All 3 links in auth footer updated

### Additional Actions Taken
- **Moved duplicate files to deprecated folder**: All old single-file pages that were using `layout: dashboard` were moved to `src/deprecated/` to prevent build conflicts
- **Moved forums folder**: The duplicate forums folder was moved to deprecated to resolve permalink conflicts

### Phase 2: Update Component Links (Medium Priority)

#### 7. Update marketplace component links
**Files**:
- `src/_includes/marketplace/hero-banner.njk`
- `src/_includes/marketplace/safety-tips.njk`
- `src/_includes/marketplace/featured-listings.njk`
- `src/_includes/marketplace/categories-section.njk`

#### 8. Update sell-item component links
**Files**:
- `src/_includes/sell-item/success-modal.njk`
- `src/_includes/sell-item/step-5-review.njk`

#### 9. Update other component links
**Files**:
- `src/_includes/virtual-garage/cta-section.njk`
- `src/_includes/dashboard/quick-actions.njk`

### Phase 3: Reorganize Layout Structure (High Priority)

#### 11. Create new layout folder structure
**Create folders**:
- `src/_layouts/global-layout-inheritances/`
- `src/_layouts/front-page-layout/`
- `src/_layouts/documentation-page-layout/`
- `src/_layouts/authorization-page-layout/`
- `src/_layouts/bikenode-main-layout-01/`
- `src/_layouts/shared-components/headers/`
- `src/_layouts/shared-components/sidebars/`
- `src/_layouts/shared-components/footers/`

#### 12-16. Move layout files to new structure
**Moves**:
- `base.njk` → `global-layout-inheritances/base-layout.njk`
- `main.njk` → `front-page-layout/front-page-layout.njk`
- `docs.njk` → `documentation-page-layout/documentation-page-layout.njk`
- `auth.njk` → `authorization-page-layout/authorization-page-layout.njk`
- `bikenode-main-layout-01.njk` → `bikenode-main-layout-01/bikenode-main-layout-01.njk`
- Move existing bikenode-main-layout-01 components from `_includes/` to layout folder

#### 17-20. Move shared components
**Moves**:
- `_includes/main-header.njk` → `_layouts/shared-components/headers/main-header.njk`
- `_includes/footer.njk` → `_layouts/shared-components/footers/main-footer.njk`
- `_includes/docs-sidebar.njk` → `_layouts/shared-components/sidebars/docs-sidebar.njk`

#### 21. Update all layout references in page files
**Update layout frontmatter in all .njk files**:
- `layout: main` → `layout: front-page-layout/front-page-layout`
- `layout: docs` → `layout: documentation-page-layout/documentation-page-layout`
- `layout: auth` → `layout: authorization-page-layout/authorization-page-layout`
- `layout: bikenode-main-layout-01` → `layout: bikenode-main-layout-01/bikenode-main-layout-01`

#### 22. Update all include references in layouts
**Update include paths**:
- `{% include "main-header.njk" %}` → `{% include "shared-components/headers/main-header.njk" %}`
- `{% include "footer.njk" %}` → `{% include "shared-components/footers/main-footer.njk" %}`
- etc.

### Phase 4: Configuration & Cleanup

#### 24. Update Eleventy configuration
**File**: `.eleventy.js`
**Update**: Ensure layout directory structure is recognized (may need to update paths)

#### 25. Clean up unused files
**Delete if confirmed unused**:
- `base-with-ab-test.njk`
- `main-header-v2.njk`
- `header-v2.njk`
- `sidebar-v2.njk`

#### 26. Update CSS references
**Check and update**: Any CSS import paths in moved layout files

### Phase 5: Testing

#### 10. Test all major routes
**Test these URLs**:
- `/` (homepage)
- `/auth-login-page/`
- `/auth-signup-page/`
- `/docs-features-guide/`
- `/dashboard-home-page/`
- `/profile-my-page/`
- `/marketplace-browse-listings/`

## Success Criteria

1. All pages load without 404 errors
2. CSS styles are properly applied to all pages
3. Navigation links work correctly
4. Layout structure is organized and maintainable
5. No broken includes or layout references

## Notes for Implementation

- **IMPORTANT**: Do not create any new files unless explicitly listed in the tasks
- **IMPORTANT**: Do not move pages or change the folder structure of content pages
- **IMPORTANT**: Only update links and reorganize layout files
- Test incrementally - fix links first, then reorganize layouts
- Keep backups of original files before making changes
- Run `npm run dev` frequently to test changes

## Common Pitfalls to Avoid

1. Don't try to create "clean" URLs by changing Eleventy config
2. Don't move content pages to different folders
3. Don't forget to update both the link href AND any active state checks
4. Don't assume a link exists - verify the actual folder name
5. Don't forget to update layout references after moving layout files