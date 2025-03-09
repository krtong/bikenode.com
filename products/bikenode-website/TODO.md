# TODO List for BikeNode Website

## Critical Fixes

1. **Update Environment Variables with Discord Bot Details**
   - **File**: `.env`
   - **Task**: Update `.env` with the "bikerole" bot credentials and settings:
     ```
     DISCORD_CLIENT_ID=1345714686078746644
     DISCORD_CLIENT_SECRET=your-secret-here  # Replace with actual secret from OAuth2 tab
     DISCORD_BOT_TOKEN=
     DISCORD_REDIRECT_URI=http://localhost:8080/callback  # Adjust for production
     SESSION_SECRET=your-secure-session-secret  # Generate a secure string
     JWT_SECRET=your-secure-jwt-secret  # Generate a secure string
     DATABASE_URL=postgres://postgres:postgres@localhost:5432/bikenode?sslmode=disable
     BOT_API_URL=https://discord.com/api/v10
     ```
   - **Priority**: High
   - **Reason**: Integrates the "bikerole" bot into BikeNode for authentication and server interactions.

2. **Correct Migration Path in `RunMigrations`**
   - **File**: `database/database.go`
   - **Task**: Update the migration source URL:
     ```go
     m, err := migrate.NewWithDatabaseInstance(
         "file:///Users/kevintong/Documents/Code/bikenode.com/products/bikenode-website/migrations",
         "postgres", driver)
     ```
   - **Priority**: High
   - **Reason**: Ensures database schema is applied correctly using migrations.

## Improvements

3. **Enhance CSV Seeding for Motorcycle Data**
   - **File**: `utils/csv.go`
   - **Task**: 
     - Add validation for optional fields (`package`, `category`, `engine`):
       ```go
       if strings.Contains(packageName, "\x00") { packageName = "" } // Sanitize
       ```
     - Log skipped duplicates explicitly:
       ```go
       if err != nil && strings.Contains(err.Error(), "duplicate") {
           log.Printf("Skipped duplicate: %s %s %d", make, modelName, year)
           continue
       }
       ```
   - **Priority**: Medium
   - **Reason**: Ensures robust data import for the motorcycle database.

4. **Streamline Database Initialization**
   - **File**: `database/database.go`, `main.go`
   - **Task**: 
     - Remove `InitSchema` and rely solely on `RunMigrations`.
     - Update `main.go` to call `RunMigrations` before seeding:
       ```go
       if err := database.RunMigrations(db); err != nil {
           logger.Fatal("Migration failed", err, nil)
       }
       if *seedFlag != "" {
           if err := utils.SeedMotorcycleData(db, *seedFlag); err != nil {
               logger.Fatal("Seeding failed", err, nil)
           }
       }
       ```
   - **Priority**: Medium
   - **Reason**: Simplifies schema management and avoids conflicts.

5. **Expand Test Coverage**
   - **Files**: `tests/*`
   - **Task**: Add tests for:
     - `ServerService.notifyBotConfigChanged` (mock HTTP client).
     - `ProfileService.ShareEventToDiscordServers` (mock Discord API).
     - `utils.SeedMotorcycleData` (mock CSV file).
   - **Priority**: Medium
   - **Reason**: Validates bot integration and data seeding.

6. **Add Database Indexes**
   - **File**: New migration `migrations/000003_add_indexes.up.sql`
   - **Task**: Create:
     ```sql
     CREATE INDEX idx_users_discord_id ON users(discord_id);
     CREATE INDEX idx_motorcycles_make_model ON motorcycles(make, model);
     CREATE INDEX idx_ownerships_user_id ON ownerships(user_id);
     CREATE INDEX idx_timeline_events_ownership_id ON timeline_events(ownership_id);
     ```
   - **Priority**: Medium
   - **Reason**: Boosts query performance for motorcycle searches and user lookups.

## Additional Tasks

7. **Complete Discord Bot Integration**
   - **Files**: `services/server_service.go`, `services/profile_service.go`
   - **Task**: 
     - In `notifyBotConfigChanged`, send config updates to "bikerole" bot:
       ```go
       req, err := http.NewRequest("POST", url, bytes.NewBuffer(configJSON))
       ```
     - Enable Presence Intent if tracking user status is needed (update bot settings in Discord Developer Portal).
   - **Priority**: High
   - **Reason**: Fully integrates "bikerole" bot for role management and event sharing.

8. **Implement Event-Server Sharing Storage**
   - **File**: `models/timeline_event.go`, `repositories/timeline_event_repository.go`
   - **Task**:
     - Create a table to track shared events with message IDs:
       ```sql
       CREATE TABLE event_server_shares (
           event_id UUID REFERENCES timeline_events(id) ON DELETE CASCADE,
           server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
           message_id TEXT NOT NULL,
           channel_id TEXT NOT NULL,
           created_at TIMESTAMP NOT NULL DEFAULT NOW(),
           PRIMARY KEY (event_id, server_id)
       );
       ```
     - Update `UpdateEventInDiscordServers` and `RemoveEventFromDiscordServer` methods to use this table.
   - **Priority**: Medium
   - **Reason**: Enables proper updating and deletion of shared events in Discord.

9. **Dynamic Motorcycle Data in Frontend**
   - **File**: `utils/motorcycle-data.ts`
   - **Task**: Fetch from `/api/motorcycles`:
     ```ts
     export async function getAllMotorcycles(): Promise<Motorcycle[]> {
         const response = await fetch('/api/motorcycles');
         return response.json();
     }
     ```
   - **Priority**: Medium
   - **Reason**: Reflects the live database instead of static JSON.

10. **Enhance Error Handling**
    - **Files**: All services/handlers
    - **Task**: 
      - Log detailed errors in `ShareEventToDiscordServers`:
        ```go
        if err != nil {
            logger.Error("Failed to share event", err, logger.Fields{"event_id": event.ID})
            return err
        }
        ```
      - Return specific HTTP error codes in `handlers/api.go`.
    - **Priority**: Medium
    - **Reason**: Improves debugging and user feedback.

11. **Update Documentation**
    - **File**: `README.md`
    - **Task**: Add:
      ```
      ## Setup
      1. Copy `.env.example` to `.env` and fill in values.
      2. Run migrations: `go run main.go`
      3. Seed data: `go run main.go -seed path/to/motorcycle_data.csv`
      4. Start server: `go run main.go`
      ```
    - **Priority**: Low
    - **Reason**: Guides setup with "bikerole" bot integration.

## Summary
- **Critical Fixes**: Set up bot credentials and correct migrations.
- **Improvements**: Refine CSV seeding, streamline database setup, expand tests, and optimize queries.
- **Additional Tasks**: Finalize bot integration, implement message tracking, update frontend, enhance errors, and document.

### Next Steps
1. Apply fixes 1-2 and verify with `go run main.go`.
2. Test bot functionality by updating a server config and sharing a timeline event.
3. Seed motorcycle data and check frontend integration.

This TODO list ensures the BikeNode website leverages the "bikerole" bot effectively, providing a seamless experience for users to manage bike roles and share stories on Discord.
