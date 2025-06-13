# Claude AI Integration for BikeNode Discord Bot

> **⚠️ Integration Principles**
> - Work with real Discord data and actual bot functionality only
> - Don't make assumptions about Discord API behavior - test and verify
> - Document actual implementation details, not theoretical features
> - Leave room for discovering edge cases and limitations
> - See core principles in [README_BEFORE_MAKING_ANY_PAGE.md]

This integration allows Discord users to send messages to Claude AI and receive responses through the BikeNode Discord bot.

## Features

- Send messages to Claude using Discord commands
- Queue messages for Claude to read
- Receive Claude's responses in the same Discord channel
- Check status of sent messages
- Admin tools for managing the message queue

## Discord Commands

All Claude commands use the bot prefix `!bike` followed by the command:

### User Commands

1. **Send a message to Claude**
   ```
   !bike claude Your message here
   ```
   - Sends your message to Claude's queue
   - Returns a message ID for tracking
   - Claude will respond when available

2. **Check message status**
   ```
   !bike claude_status
   ```
   - Shows your last 5 messages to Claude
   - Displays status (pending/responded/error)
   - Shows timestamps and message previews

3. **Get help**
   ```
   !bike claude_help
   ```
   - Shows all available Claude commands
   - Explains how the system works

### Admin Commands

1. **Clear all messages** (Admin only)
   ```
   !bike claude_clear
   ```
   - Clears all pending messages
   - Creates a backup before clearing

2. **Manually add a response** (Admin only)
   ```
   !bike claude_respond <message_id> <response>
   ```
   - Manually add Claude's response to a message
   - Useful for testing or manual intervention

## How It Works

1. **Message Flow**:
   - User sends a message using `!bike claude <message>`
   - Message is stored in `data/claude/messages.json` with status "pending"
   - Claude reads pending messages using the interface script
   - Claude adds responses to `data/claude/responses.json`
   - Bot watches for new responses and sends them to Discord
   - Message status is updated to "responded"

2. **Data Storage**:
   - Messages: `discord-bot/data/claude/messages.json`
   - Responses: `discord-bot/data/claude/responses.json`
   - Automatic cleanup of conversations older than 1 hour

3. **Response Delivery**:
   - Bot checks for new responses every 5 seconds
   - Responses are sent as embeds in the original channel
   - Supports messages up to 4000 characters

## Claude Interface Script

A Python script is provided for Claude to interact with the message queue:

### Running the Interface

```bash
cd discord-bot
python claude_interface.py --interactive
```

### Command Line Options

- `--read`: Display all pending messages
- `--respond MESSAGE_ID "Your response"`: Add a response to a specific message
- `--interactive` or `-i`: Run in interactive mode (default)

### Interactive Mode

The interactive mode provides a menu-driven interface:
1. View pending messages
2. View all messages
3. Respond to a message
4. Exit

### Example Usage

1. **View pending messages**:
   ```bash
   python claude_interface.py --read
   ```

2. **Respond to a message**:
   ```bash
   python claude_interface.py --respond "123456789_987654321_1234567890" "Hello! This is Claude's response."
   ```

3. **Interactive session**:
   ```bash
   python claude_interface.py -i
   ```

## Message Format

Messages are stored with the following structure:

```json
{
  "id": "unique_message_id",
  "timestamp": "2024-01-20T10:30:00",
  "user": {
    "id": "discord_user_id",
    "name": "username",
    "discriminator": "1234",
    "display_name": "Display Name"
  },
  "channel": {
    "id": "channel_id",
    "name": "channel-name"
  },
  "server": {
    "id": "server_id",
    "name": "Server Name"
  },
  "message": "The actual message content",
  "status": "pending|responded|error",
  "response": "Claude's response (if any)"
}
```

## Setup Requirements

1. The bot must have the Claude commands cog loaded (already configured)
2. Ensure the `data/claude/` directory has write permissions
3. The bot requires message send permissions in the channels where it operates

## Security Considerations

- Admin commands require Discord administrator permissions
- Messages are stored locally on the server
- No external API calls are made (messages stay within the bot's system)
- Automatic cleanup prevents indefinite message storage

## Troubleshooting

1. **Bot not responding to commands**:
   - Check bot prefix in `config.yaml` (should be `!bike `)
   - Ensure bot has message read/send permissions
   - Check bot logs for errors

2. **Messages not being delivered**:
   - Verify the response watcher is running (check logs)
   - Ensure response file has correct format
   - Check if conversation hasn't expired (1 hour timeout)

3. **Permission errors**:
   - Ensure data directory is writable
   - Check file permissions on message/response files

## Future Enhancements

- Web interface for Claude to read/respond to messages
- Integration with Claude API for automatic responses
- Message threading and conversation context
- Rate limiting and spam protection
- Message categories and filtering