Hi claude, it is extremely important that you read this entire document before making any new page for the bikenode website. \
  This document will explain how to make a new page, what css to use, and how to structure the folder for that page. \
  If you do not follow these instructions, it will cause problems later on when we try to integrate your page into the website.

  INSTRUCTIONS:
  1. DO NOT create any new css files unless ABSOLUTELY necessary. \
  2. DO NOT create any new js files unless ABSOLUTELY necessary. \
  3. DO NOT create any new images unless ABSOLUTELY necessary. \
  4. DO NOT create any new assets unless ABSOLUTELY necessary. \
  5. DO NOT create any new folders unless ABSOLUTELY necessary.
  6.  study the existing bn-global css to learn what css already exists. \
  7. use either the documentation layout OR the bikenode-main-layout-01. \
  8. DO NOT create any css for the sidebar or header. \
  9. if you ABSOLUTELY NEED to make your own css becuase what you need isnt in BN-global, then make sure to create a css file INSIDE the folder for that page and name all classes and id's after that specific 
  page. \
  10. keep all images, js, and whatever other assets that are specific to that page INSIDE that page's folder, always keep any name scheme highly speciifc to that page and name everything you can after that specific page.
  11. NEVER USE ANY GENERIC CLASS NAMES, ID'S, FILE NAMES, FOLDER NAMES, METHODS. 
  12. UNLESS EXPLICITLY STATED, DO NOT MODIFY OR CREATE ANY FIELDS OR TABLES IN THE POSTGRESQL DATABASE. IF YOU NEED DATA TO POPULATE YOUR PAGE, USE EXISTING TABLES AND FIELDS, OR IF YOU ABSOLUTELY NEED TO, CREATE A JSON FILE INSIDE THE PAGE'S FOLDER. 
  13. DOUBLE CHECK FOR EXISTING FILES AND FOLDERS BEFORE CREATING NEW ONES. THEY MAY NOT BE THE EXACT NAME YOU THOUGHT THEY WERE> 

  FOLDER STRUCTURE:
  /Dashboard-Overview/

      - /dashboard-home-page/ - Main dashboard page
      - /dashboard-activity-feed/ - Activity feed timeline

      /Profile/

      - /profile-my-page/ - View your own profile
      - /profile-edit-form/ - Edit profile details
      - /profile-achievements-list/ - Personal achievements
      - /profile-following-list/ - People you follow
      - /profile-followers-list/ - People following you

      /Bikes/

      - /bikes-my-garage/ - Virtual garage with all bikes
      - /bikes-add-form/ - Add new bike workflow
      - /bikes-maintenance-log/ - Maintenance tracking
      - /bikes-details-page/ - Individual bike details

      /Gear/

      - /gear-my-collection/ - Personal gear inventory
      - /gear-equipment-catalog/ - Equipment database browser

      /Rides/

      - /rides-my-dashboard/ - Personal rides overview
      - /rides-record-tracker/ - Active ride recording
      - /rides-browse-gallery/ - Public routes gallery
      - /rides-create-planner/ - Route planning tool
      - /rides-activity-heatmap/ - Personal heatmap
      - /rides-segments-leaderboard/ - Segments with rankings
      - /rides-training-plans/ - Personal training programs
      - /rides-details-page/ - Individual ride details
      - /rides-route-details/ - Individual route details

      /Community/

      - /community-my-list/ - Communities you've joined
      - /community-browse-directory/ - Discover all communities
      - /community-create-form/ - New community creation
      - /community-forums-list/ - Forum categories
      - /community-forum-thread/ - Individual forum thread
      - /community-create-post/ - New forum post
      - /community-messages-inbox/ - Private messaging inbox
      - /community-message-conversation/ - Individual conversation

      /Marketplace/

      - /marketplace-browse-listings/ - All marketplace items
      - /marketplace-create-listing/ - Sell item form
      - /marketplace-my-listings/ - Your active listings
      - /marketplace-item-details/ - Individual item page

      Events 

      - /events-browse-calendar/ - All cycling events
    - /events-create-form/ - Create new event
      - /events-my-list/ - Events you're attending
      - /events-details-page/ - Individual event page

      /Discord/

      - /discord-my-servers/ - Your Discord servers
      - /discord-bot-management/ - Bot configuration
      - /discord-bot-setup/ - Setup instructions

      /Settings/

      - /settings-account-page/ - Account preferences
      - /settings-privacy-page/ - Privacy controls
      - /settings-notifications-page/ - Notification preferences
      - /settings-email-page/ - Email preferences
      - /settings-security-page/ - Security options

      /Documentation/

      - /docs-home-page/ - Docs landing page
      - /docs-about-bikenode/ - About us
      - /docs-features-guide/ - Features documentation
      - /docs-api-reference/ - API docs
      - /docs-support-center/ - Support resources
      - /docs-privacy-policy/ - Privacy policy
      - /docs-terms-service/ - Terms of service
      - /docs-community-guidelines/ - Community rules

      /Admin/

      - /admin-dashboard-home/ - Admin overview
      - /admin-user-management/ - User administration
      - /admin-content-moderation/ - Content moderation
      - /admin-reports-management/ - User reports
      - /admin-analytics-dashboard/ - Site analytics
      - /admin-system-health/ - System monitoring

      /Authentication/

      - /auth-login-page/ - Login form
      - /auth-signup-page/ - Registration form
      - /auth-forgot-password/ - Password recovery
      - /auth-verify-email/ - Email verification