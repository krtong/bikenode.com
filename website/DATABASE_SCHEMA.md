# BikeNode Mock Database Schema

This document outlines the database tables needed to support all features across the BikeNode platform, based on analysis of mock data currently displayed throughout the website.

## Database Tables

### 1. **users**
- id, username, email, password_hash, full_name, avatar_url, bio, location, member_since, last_active
- profile_views, following_count, followers_count

### 2. **bikes** (motorcycles and bicycles)
- id, user_id, type (motorcycle/bicycle), brand, model, year, nickname
- category, size/engine_size, color, vin/serial_number
- purchase_date, purchase_price, current_value, condition
- primary_image, mileage, is_active, created_at

### 3. **bike_specs**
- id, bike_id, spec_type, spec_key, spec_value
- (Flexible key-value pairs for different bike types)

### 4. **bike_photos**
- id, bike_id, photo_url, caption, is_primary, upload_date

### 5. **maintenance_records**
- id, bike_id, date, type, description, cost, mileage, service_provider

### 6. **rides**
- id, user_id, bike_id, route_id, title, date, distance, duration
- elevation_gain, avg_speed, max_speed, calories, weather
- map_data (JSON), photos (JSON array), is_public

### 7. **ride_comments**
- id, ride_id, user_id, comment, timestamp, parent_comment_id

### 8. **ride_kudos**
- id, ride_id, user_id, timestamp

### 9. **routes**
- id, creator_id, name, description, distance, elevation_gain
- duration_estimate, difficulty, surface_types (JSON), waypoints (JSON)
- tags (array), saves_count, completions_count, rating, is_public

### 10. **segments**
- id, route_id, name, category, distance, elevation_gain
- avg_grade, max_grade, start_point, end_point, bounds (JSON)
- popularity_score, total_attempts

### 11. **segment_efforts**
- id, segment_id, user_id, ride_id, time, date, rank, is_pr

### 12. **marketplace_listings**
- id, seller_id, source_type (bike/gear/custom), source_id
- title, description, price, condition, category
- location, images (JSON), status, created_at, updated_at

### 13. **gear_items**
- id, user_id, category, brand, model, size, color
- purchase_date, purchase_price, current_value, condition
- usage_count, tags (array), notes, images (JSON)

### 14. **communities**
- id, name, type, description, avatar_url, banner_url
- member_count, post_count, created_at, is_active

### 15. **community_members**
- id, community_id, user_id, role, joined_at, last_active

### 16. **forum_categories**
- id, name, description, icon, thread_count, post_count, order_index

### 17. **forum_threads**
- id, category_id, author_id, title, is_pinned, is_locked
- view_count, reply_count, last_post_at, created_at

### 18. **forum_posts**
- id, thread_id, author_id, content, is_edited, created_at, updated_at

### 19. **achievements**
- id, user_id, type, title, description, icon, rarity
- earned_date, progress, is_unlocked

### 20. **activity_heatmap**
- id, user_id, lat, lng, intensity, timestamp, activity_type

### 21. **user_stats**
- user_id, total_rides, total_distance, total_elevation
- total_duration, bikes_owned, communities_joined, gear_items

### 22. **notifications**
- id, user_id, type, title, message, link, is_read, created_at

### 23. **user_follows**
- follower_id, following_id, created_at

### 24. **discord_servers**
- id, community_id, server_name, invite_link, member_count

### 25. **user_preferences**
- user_id, units (metric/imperial), privacy_level, email_notifications
- push_notifications, theme, language, timezone

### 26. **bike_crash_reports**
- id, bike_id, date, severity, description, damage_assessment
- repair_cost, insurance_claim, photos (JSON)

### 27. **marketplace_favorites**
- user_id, listing_id, created_at

### 28. **marketplace_messages**
- id, listing_id, sender_id, recipient_id, message, timestamp, is_read

### 29. **route_saves**
- user_id, route_id, saved_at

### 30. **route_completions**
- user_id, route_id, ride_id, completed_at, rating

### 31. **blog_posts**
- id, author_id, title, slug, excerpt, content, cover_image
- read_time, likes_count, comments_count, tags (array)
- is_published, published_at, created_at, updated_at

### 32. **blog_likes**
- user_id, post_id, created_at

### 33. **blog_comments**
- id, post_id, user_id, content, parent_comment_id, created_at

### 34. **gear_categories**
- id, name, icon, parent_category_id, order_index

### 35. **gear_brands**
- id, name, logo_url, website, category_specialties (array)

### 36. **activity_feed**
- id, user_id, activity_type, activity_data (JSON), timestamp
- is_public, likes_count, comments_count

### 37. **challenges**
- id, name, description, type, start_date, end_date
- goal_value, goal_unit, badge_icon, participants_count

### 38. **challenge_participants**
- challenge_id, user_id, progress, completed_at, rank

### 39. **weather_logs**
- id, ride_id, temperature, conditions, wind_speed, wind_direction
- humidity, precipitation, timestamp

### 40. **bike_components**
- id, bike_id, component_type, brand, model, install_date
- mileage, service_interval, last_service, notes

### 41. **training_plans**
- id, user_id, name, goal, start_date, end_date, activities (JSON)

### 42. **events**
- id, organizer_id, community_id, name, description, date
- location, max_participants, registration_deadline, is_public

### 43. **event_participants**
- event_id, user_id, status, registered_at

### 44. **gear_wishlists**
- id, user_id, gear_item_id, priority, notes, added_at

### 45. **marketplace_offers**
- id, listing_id, buyer_id, offer_amount, message, status
- created_at, responded_at

## Key Relationships and Considerations

### Data Relationships:
1. **Users** own bikes, gear, routes, and create content
2. **Bikes** have specs, photos, maintenance records, and crash reports
3. **Rides** reference bikes, routes, and generate segments efforts
4. **Communities** have members with different roles
5. **Marketplace** listings can reference bikes or gear from collections
6. **Forums** have hierarchical structure (categories → threads → posts)

### JSON Fields Usage:
- **waypoints**: Route coordinate arrays
- **map_data**: GPX or coordinate data for rides
- **photos**: Arrays of image URLs
- **tags**: Flexible categorization
- **surface_types**: Multiple surface types per route
- **activity_data**: Flexible activity feed content

### Computed/Derived Data:
- Leaderboards (from segment efforts)
- Popular times (from activity heatmap)
- Statistics (aggregated from various tables)
- Trending topics (from forum activity)
- Achievement progress (from user activities)

### Mock Data Generation Needs:
- Realistic bike specifications for different types
- Sample maintenance schedules
- Route coordinate data with elevation profiles
- Activity patterns for heatmaps
- Forum discussion topics
- Gear inventory items
- Achievement criteria and progress tracking

## Implementation Notes

### For JavaScript Mock Database:
1. Use IndexedDB or localStorage for persistence
2. Create a data access layer with CRUD operations
3. Implement relationships through ID references
4. Add data validation and constraints
5. Create seed data generators for each table
6. Implement query methods that mimic SQL operations
7. Add event system for data changes to update UI

### Data Sync Considerations:
- Central data store accessible from all pages
- Event-driven updates when data changes
- Lazy loading for large datasets
- Caching strategy for frequently accessed data
- Mock API endpoints that return data from the mock database

This schema provides comprehensive coverage for all features currently mocked in the BikeNode website, enabling proper data relationships and synchronization across different sections of the application.