-- Drop tables in reverse order to avoid foreign key constraints
DROP TABLE IF EXISTS user_server_visibility;
DROP TABLE IF EXISTS event_server_shares;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS server_configs;
DROP TABLE IF EXISTS servers;
DROP TABLE IF EXISTS timeline_events;
DROP TABLE IF EXISTS ownerships;
DROP TABLE IF EXISTS motorcycles;
DROP TABLE IF EXISTS users;
