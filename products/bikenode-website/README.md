# BikeNode Website

## Project Structure
```
bikenode-website/
├── templates/           # HTML templates
│   ├── layouts/         # Base layouts
│   ├── pages/           # Page-specific templates
│   └── components/      # Reusable UI components
├── static/              # Static assets
│   ├── css/             # Stylesheets
│   │   ├── base/        # Base styles
│   │   ├── components/  # Component styles
│   │   └── pages/       # Page-specific styles
│   ├── js/              # JavaScript files
│   └── images/          # Image assets
└── docs/                # Documentation
```

## Template System

This project uses Go's templating system. Here's how to use it:

### Layouts

All pages should extend the base layout:

```html
{{ template "layouts/base.html" . }}

{{ define "content" }}
  <!-- Your page content here -->
{{ end }}
```

### Components

Reusable components can be included like this:

```html
{{ template "components/component-name.html" . }}
```

## CSS Structure

- `style.css`: Global styles and variables
- Page-specific CSS: Named after the corresponding HTML template

## Development Guidelines

1. Always extend the base layout for new pages
2. Create reusable components for UI elements used across multiple pages
3. Follow the established CSS naming conventions
4. Keep templates focused on structure and leave styling to CSS files

## Development

### Prerequisites
- [List requirements here]

### Setup
1. [Setup instructions]
2. [More instructions]

### Running Locally
[Instructions for running locally]
