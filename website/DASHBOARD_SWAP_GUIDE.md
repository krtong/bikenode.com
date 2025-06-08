# Dashboard Version Swap Guide

## Quick Swap Methods

### Method 1: Using the Toggle Script (Easiest)
```bash
node toggle-dashboard.js
```

### Method 2: Edit Configuration File
Edit `src/_data/dashboardConfig.js` and change the version:

```javascript
module.exports = {
  // Change to 'v2' for new dashboard, 'v1' for original
  version: 'v2',  // <-- Change this value
  
  // ... rest of config
};
```

### Method 3: Environment Variable (Future Enhancement)
```bash
# Set environment variable before running
DASHBOARD_VERSION=v2 npm run dev
```

## Current Setup

- **Original Dashboard (v1)**: Classic layout with existing components
- **New Dashboard (v2)**: Modern redesign with enhanced features

## File Structure

```
src/
├── dashboard.njk          # Main router (checks config)
├── dashboard-v1.njk       # Backup of original dashboard
├── dashboardConfig.js     # Configuration file
├── dashboard/             # Original dashboard components
└── dashboard-v2/          # New dashboard implementation
    ├── content.njk        # Main content (for inclusion)
    ├── index.njk          # Standalone page
    ├── components/        # Reusable components
    ├── js/               # JavaScript modules
    └── styles/           # CSS files
```

## Features by Version

### V1 Features
- Traditional layout
- Basic stats grid
- Quick actions
- Recent activity
- Popular destinations

### V2 Features
- Modern glass morphism design
- Collapsible sidebar
- Real-time updates via WebSocket
- Enhanced widgets system
- Dark/light theme toggle
- Mobile-responsive design
- Improved accessibility

## Testing Both Versions

1. **Direct Access** (always available):
   - V1: Controlled by config at `/dashboard`
   - V2: Always available at `/dashboard-v2`

2. **A/B Testing**:
   - Enable in `dashboardConfig.js`:
   ```javascript
   abTesting: {
     enabled: true,
     percentage: 50  // 50% see v2
   }
   ```

## Deployment Considerations

1. **Performance**: V2 has more features but is optimized with:
   - Lazy loading
   - Code splitting
   - Efficient animations

2. **Browser Support**: V2 requires modern browsers for:
   - CSS Grid
   - CSS Custom Properties
   - WebSocket support

3. **Fallbacks**: V2 gracefully degrades when features are missing

## Rollback Process

If you need to rollback to V1:

1. Run `node toggle-dashboard.js` or
2. Set `version: 'v1'` in config
3. Restart the dev server

## Monitoring

Track these metrics when comparing versions:
- Page load time
- Time to interactive
- User engagement
- Error rates
- Conversion rates

## Gradual Rollout Strategy

1. **Phase 1**: Internal testing (staff only)
2. **Phase 2**: 10% of users
3. **Phase 3**: 50% of users
4. **Phase 4**: 100% deployment

## Troubleshooting

### V2 Not Loading
- Check if assets are copied in `.eleventy.js`
- Verify JavaScript files are loading
- Check browser console for errors

### Styles Missing
- Ensure CSS files are in correct paths
- Check if dark mode is causing issues
- Verify CSS custom properties support

### Performance Issues
- Disable real-time features temporarily
- Check WebSocket connection
- Review browser performance tab

## Support

For issues or questions:
- Check browser console for errors
- Review the README in dashboard-v2
- Contact the development team