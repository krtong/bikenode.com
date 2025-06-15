# Claude Code Instance Coordination System

A comprehensive shell script-based coordination system for Claude Code instances with full logging, message tracking, and chatroom management.

## Communication Standards

**All agents must adhere to these guidelines:**
- Use factual, technical language only
- No self-congratulatory rhetoric or celebratory statements  
- Focus on implementation details and coordination needs
- Maintain professional, neutral tone in all communications

## Available Commands

### Messaging
```bash
# Send message to chatroom
./send-message '#chatroom-name' "Working on coordination system"

# Send direct message  
./send-message '@instance-2' "Private coordination message"

# Check your inbox
./check-inbox

# Check all unread messages with details
./check-unread-messages

# Mark specific message as read
./mark-read <message_id>
```

### Notifications & Status
```bash
# Check @mentions and system alerts
./check-notifications

# Update your status
./update-status "Active - working on messaging system"

# Check all agent statuses
./check-status

# Get comprehensive help
./help
```

### Chatroom Management
```bash
# List available chatrooms
./list-chatrooms

# Send to specific chatrooms
./send-message '#ai-messaging' "Message for AI team"
./send-message '#crawler' "Message for crawler team"
./send-message '#general' "General coordination message"
```

### System & Logging
```bash
# Manual action logging
./log-action "ACTION_TYPE" "details"

# All actions are automatically logged with timestamps
# Logs are secured (600 permissions) to prevent direct access
```

## File Structure

```
coordination/
├── send-message              # Send messages (chatrooms/DMs)
├── check-inbox              # Check your inbox
├── check-unread-messages    # Check all unread messages
├── check-notifications      # Check @mentions and alerts
├── mark-read               # Mark messages as read
├── update-status           # Update your status
├── check-status            # View all agent statuses
├── list-chatrooms          # List available chatrooms
├── log-action              # Action logging function
├── help                    # Comprehensive help system
├── read-status/            # Per-agent read position tracking
│   ├── instance-1_positions.txt
│   ├── instance-2_positions.txt
│   └── ...
└── data/                   # Secured data files (600 permissions)
    ├── action-log.txt      # Comprehensive action logging
    ├── messages.log        # All message history with IDs
    ├── read-receipts.log   # Read receipt tracking
    └── status.txt          # Instance status updates
```

## Features

- **Comprehensive Logging**: All actions timestamped and logged
- **Read Tracking**: Per-agent position tracking for unread messages
- **Notifications**: @mention detection and system alerts
- **Chatroom Support**: Project-specific chatrooms (#ai-messaging, #crawler, #general)
- **Direct Messages**: Private agent-to-agent communication
- **Security**: Log files secured with 600 permissions
- **Message IDs**: Unique identification for all messages

## Instance IDs
- `instance-1` through `instance-6`
- Set your ID: `export CLAUDE_INSTANCE_ID="instance-X"`

## Example Usage

```bash
# Set your instance ID
export CLAUDE_INSTANCE_ID="instance-2"

# Send to chatroom
./send-message '#ai-messaging' "Starting notification system implementation"

# Send direct message
./send-message '@instance-1' "Need status update on messaging system"

# Check notifications
./check-notifications

# Check unread messages
./check-unread-messages

# Update your status
./update-status "Active - implementing notifications system"

# Get help
./help
```