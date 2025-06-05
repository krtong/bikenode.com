# BikeNode 11ty Site Architecture

## Overview

The BikeNode 11ty website is a comprehensive static site that serves as mockups and prototypes for the full BikeNode platform. It demonstrates the complete user experience flow from discovery to engagement, with working examples of all major features.

## Layout Hierarchy

### Layout Inheritance Structure

```
base.njk (Root Layout)
├── main.njk (Public Pages)
├── dashboard.njk (Authenticated Pages)
├── auth.njk (Authentication Pages)
└── docs.njk (Documentation Pages)
```

### Layout Details

#### 1. base.njk
**Purpose**: Root HTML structure for all pages
**Components**:
- HTML doctype and structure
- Head include with meta tags and CSS
- Background canvas include
- Content injection point
- Scripts include

#### 2. main.njk
**Purpose**: Public marketing and informational pages
**Extends**: base.njk
**Components**:
- Main header navigation
- Full-width content area

#### 3. dashboard.njk
**Purpose**: Authenticated user interface pages
**Extends**: base.njk
**Components**:
- Dashboard header with user menu
- Dashboard sidebar navigation
- Main content area with breadcrumbs
- Content header with title/subtitle

#### 4. auth.njk
**Purpose**: Login, signup, and password reset pages
**Extends**: base.njk
**Components**:
- Custom auth CSS
- Centered card layout
- Logo and form header
- Footer with legal links

#### 5. docs.njk
**Purpose**: Documentation and feature pages
**Extends**: base.njk
**Components**:
- Main header navigation
- Documentation sidebar
- Content area with headers

## Include Components

### Navigation Components

#### main-header.njk
**Used by**: main.njk, docs.njk
**Features**:
- BikeNode logo linking to home
- Primary navigation: Features, Discord Bot, Web Extension, Community, Profile
- Authentication CTAs: Log In (secondary), Sign Up (primary)
- Active page highlighting

#### dashboard-header.njk
**Used by**: dashboard.njk
**Features**:
- Logo linking to home
- Dashboard navigation: Dashboard, Virtual Garage, Discord, Communities
- User avatar and dropdown menu
- Account settings and logout links

#### dashboard-sidebar.njk
**Used by**: dashboard.njk
**Features**:
- Organized navigation sections: Overview, My Content, Administration, Settings
- Icon-based navigation with descriptions
- Active page highlighting
- Emoji icons for visual hierarchy

#### docs-sidebar.njk
**Used by**: docs.njk
**Features**:
- Feature documentation links
- Community and support links
- Company information links
- Legal and contact links

### Utility Components

#### head.njk
**Used by**: base.njk
**Features**:
- Dynamic title generation
- Meta description with fallback
- Favicon and core CSS
- Conditional CSS loading:
  - Dashboard CSS for authenticated pages
  - Docs CSS for documentation pages

#### scripts.njk
**Used by**: base.njk
**Features**:
- Background animation script
- Custom JavaScript injection
- Inline JavaScript support

#### background-canvas.njk
**Used by**: base.njk
**Features**:
- Animated background canvas element

## Page Structure Analysis

### Public Pages (31 total)

#### Marketing & Discovery (5 pages)
- **index.njk**: Landing page with hero, features, and CTAs
- **features.njk**: Comprehensive feature showcase
- **about.njk**: Company information and mission
- **contact.njk**: Multi-channel contact options
- **blog.njk**: News and updates (placeholder)

#### Product Features (4 pages)
- **discord-bot.njk**: Bot features and setup
- **web-extension.njk**: Browser extension information
- **virtual-garage.njk**: Garage feature marketing
- **community.njk**: Community guidelines and links

#### Authentication (3 pages)
- **mock-login.njk**: User login simulation
- **mock-signup.njk**: User registration simulation
- **forgot-password.njk**: Password recovery flow

#### Support & Legal (4 pages)
- **support.njk**: Help center with FAQ
- **feedback.njk**: User feedback form
- **terms.njk**: Terms of service
- **privacy.njk**: Privacy policy

#### Dashboard Pages (15 pages)

##### Core Dashboard
- **dashboard.njk**: Main dashboard with stats and quick actions
- **profile.njk**: User profile with tabbed interface
- **account-settings.njk**: Account management
- **notification-settings.njk**: Notification preferences

##### Virtual Garage
- **virtual-garage-dashboard.njk**: Bike collection overview
- **add-bike.njk**: Complex vehicle selection interface
- **bike-details.njk**: Individual bike details with tabs
- **edit-bike.njk**: Bike editing interface
- **bike-maintenance.njk**: Maintenance tracking system

##### Community Management
- **communities-dashboard.njk**: Community participation
- **discord-dashboard.njk**: Discord server management
- **bot-management.njk**: Discord bot configuration

##### Administration
- **admin-dashboard.njk**: Admin panel with system stats
- **analytics-dashboard.njk**: Community analytics
- **bot-setup.njk**: Bot setup wizard

## Data Flow & Integration

### Static Data Sources

#### 1. bikes.js (_data/bikes.js)
**Content**: Array of 5 sample bikes (2 motorcycles, 3 bicycles)
**Structure**:
```javascript
{
  id: number,
  name: string,
  type: string,
  category: "motorcycle" | "bicycle",
  year: number,
  make: string,
  model: string,
  image: string,
  photos: number,
  records: number,
  communities: number,
  specs: object
}
```

**Used by**:
- **virtual-garage-dashboard.njk**: Display all bikes in grid
- **virtual-garage.njk**: Show sample bikes in hero
- **profile.njk**: Display user's bikes
- **bike-details.njk**: Dynamic page generation via pagination

### Dynamic Page Generation

#### 1. Bike Details Pages
**File**: bike-details.njk
**Pagination Configuration**:
```yaml
pagination:
  data: bikes
  size: 1
  alias: bike
permalink: "/bike-details/{{ bike.id }}/"
```
**Output**: Generates `/bike-details/1/` through `/bike-details/5/`

### API Integration Simulation

#### 1. Add Bike Interface (add-bike.njk)
**Features**:
- Simulated API calls to fetch motorcycle/bicycle data
- Category selection → Brand selection → Year selection → Model selection
- Integration with external bike databases
- Real-time search and filtering

**API Endpoints Simulated**:
- `http://localhost:8080/api/motorcycles/makes`
- `http://localhost:8080/api/bicycles/manufacturers`
- `http://localhost:8080/api/motorcycles/years/{make}`
- `http://localhost:8080/api/motorcycles/models/{make}/{year}`

### CSS Architecture

#### 1. Core Styles (index.css)
**Features**:
- CSS custom properties for theming
- Discord-inspired dark theme
- Typography and layout foundations
- Responsive breakpoints

#### 2. Specialized Stylesheets
- **dashboard.css**: Dashboard-specific components
- **docs.css**: Documentation layout styles
- **auth.css**: Authentication page styles
- **bike-details.css**: Bike detail page components
- **profile.css**: Profile page styling

#### 3. Conditional Loading
**Logic**: Automatic CSS loading based on URL patterns
- Dashboard CSS: Pages containing 'dashboard', 'bot-management', 'admin', etc.
- Docs CSS: Pages containing 'docs', 'blog', 'about', 'features', etc.

## JavaScript Functionality

### Universal Features
- **background.js**: Animated particle background
- Interactive form elements
- Modal dialogs and photo viewers
- Tab navigation systems
- Search and filtering interfaces

### Page-Specific Features
- **Dashboard**: Stats widgets, activity feeds, quick actions
- **Virtual Garage**: Bike filtering, search, modal photo viewing
- **Add Bike**: Complex vehicle selection with API integration
- **Profile**: Social media integration, tabbed content
- **Admin**: Community management interfaces

## User Journey Flows

### 1. Discovery → Conversion
```
/ (Landing) → /features/ → /mock-signup/ → /dashboard/
```

### 2. Feature Exploration
```
/ → /discord-bot/ or /virtual-garage/ → /mock-signup/ → Feature Dashboard
```

### 3. Community Engagement
```
/ → /community/ → External Discord → /mock-signup/ → /communities-dashboard/
```

### 4. Bike Management
```
/dashboard/ → /virtual-garage-dashboard/ → /add-bike/ → /bike-details/{id}/
```

### 5. Administrative
```
/dashboard/ → /admin-dashboard/ → /bot-management/ → /analytics-dashboard/
```

## Technical Architecture

### Build Process
**Framework**: Eleventy (11ty)
**Input Directory**: `src/`
**Output Directory**: `_site/`
**Template Engine**: Nunjucks (.njk files)

### File Organization
```
src/
├── _data/           # Global data files
├── _includes/       # Reusable components
├── _layouts/        # Page layouts
├── *.njk           # Page templates
assets/
├── css/            # Stylesheets
├── js/             # JavaScript files
└── images/         # Static images
```

### CSS Custom Properties
**Theme Variables**:
- `--bg-primary`, `--bg-secondary`: Background colors
- `--text-primary`, `--text-secondary`: Text colors
- `--accent`, `--accent-hover`: Brand colors
- `--card-bg`: Card background color

### Responsive Design
**Breakpoints**:
- Mobile-first approach
- Primary breakpoint: 768px
- Grid systems with auto-fit and minmax
- Flexible navigation patterns

## Integration Points

### External Services
- **Discord**: OAuth simulation, server invites
- **Social Media**: Strava, Instagram profile links
- **Email**: Contact forms and newsletter signups

### Mock APIs
- Bike data fetching simulation
- User authentication flows
- Community management operations
- Analytics data display

### Future Integration Ready
- Real authentication system
- Database connectivity
- File upload handling
- Real-time chat integration

## Accessibility Features
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly content
- Mobile-responsive design

This architecture demonstrates a production-ready static site that can seamlessly transition to a dynamic application while maintaining excellent user experience and development organization.