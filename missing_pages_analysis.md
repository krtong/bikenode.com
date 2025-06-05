# Missing Pages Analysis for BikeNode Website

## Summary
This analysis identifies all href links in the .njk template files that point to pages that don't currently exist in the project.

## Existing Pages (26 total)
- about
- account-settings
- add-bike
- admin-dashboard
- analytics-dashboard
- bike-details
- blog
- bot-management
- bot-setup
- communities-dashboard
- community
- contact
- dashboard
- discord-bot
- discord-dashboard
- features
- index
- mock-login
- mock-signup
- notification-settings
- privacy
- profile
- terms
- virtual-garage-dashboard
- web-extension

## Missing Pages (24 total)

### Authentication & User Management
1. `/forgot-password/` - Password recovery page (referenced in auth pages)
2. `/user-management/` - Admin user management page (referenced in admin-dashboard)

### Community Features
3. `/communities/` - List of partner communities (referenced in docs-sidebar)
4. `/community-create/` - Create new community page (referenced in communities-dashboard)
5. `/community-management/` - Manage communities page (referenced in communities-dashboard)
6. `/community-settings/` - Community settings page (referenced in community pages)
7. `/community/cruiser-nation/` - Specific community page example
8. `/community/mountain-bike-central/` - Specific community page example
9. `/community/sport-bike-riders/` - Specific community page example
10. `/community/mountain-bike-central/manage/` - Community management page
11. `/community/sport-bike-riders/manage/` - Community management page
12. `/community-tools/` - Community tools overview (referenced in docs-sidebar)

### Discord Bot Features
13. `/bot-documentation/` - Bot documentation page (referenced in bot-setup)
14. `/bot-setup-guide/` - Detailed bot setup guide (referenced in bot-management)
15. `/command-help/` - Bot commands help page (referenced in discord-bot)
16. `/server-analytics/` - Server analytics page (referenced in discord-dashboard)
17. `/server-invite/` - Server invite management (referenced in discord-dashboard)
18. `/server-moderation/` - Server moderation tools (referenced in bot-management)
19. `/server-settings/` - Server-specific settings (referenced in discord-dashboard)
20. `/request-permissions/` - Bot permissions request page (referenced in bot-setup)
21. `/moderation-queue/` - Moderation queue page (referenced in admin-dashboard)

### Bike Management
22. `/bike-maintenance/` - Bike maintenance tracking (referenced in bike-details)
23. `/edit-bike/` - Edit bike details page (referenced in bike-details)

### Virtual Garage
24. `/virtual-garage/` - Virtual garage overview page (referenced in docs-sidebar)

### Support & Feedback
25. `/support/` - Support page (referenced in docs-sidebar)
26. `/feedback/` - Feedback submission page (referenced in docs-sidebar)

### Company Pages
27. `/careers/` - Careers page (referenced in docs-sidebar)
28. `/press/` - Press page (referenced in docs-sidebar)

## Recommendations

1. **Priority 1 - Core Functionality:**
   - `/forgot-password/` - Essential for user authentication flow
   - `/virtual-garage/` - Key feature page referenced in navigation
   - `/communities/` - Important for community discovery
   - `/support/` and `/feedback/` - User support channels

2. **Priority 2 - Community Features:**
   - Community management pages
   - Community-specific pages (can be dynamic templates)
   - Community creation and settings

3. **Priority 3 - Discord Bot Features:**
   - Bot documentation and setup guides
   - Server management pages
   - Command help and analytics

4. **Priority 4 - Company/Info Pages:**
   - `/careers/`
   - `/press/`

## Notes
- Some pages like specific community pages (`/community/cruiser-nation/`) might be better served by dynamic routing
- The bike-details page appears to use dynamic routing already (`/bike-details/{{ bike.id }}/`)
- External links (Discord invite links, social media) are correctly pointing to external URLs