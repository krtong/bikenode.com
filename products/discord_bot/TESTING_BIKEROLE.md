# Testing the BikeRole Discord Bot

This guide will help you test your BikeRole bot with the configured application settings.

## Prerequisites

Ensure you have:
1. Set up your bot in the Discord Developer Portal with application ID `1345714686078746644`
2. Added the bot to your Discord server with the proper permissions
3. Set your bot token in the environment variables

## Running the Test Script

1. Open a terminal and navigate to your project directory:
   ```bash
   cd /Users/kevintong/Documents/Code/bikenode.com/data
   ```

2. Set your Discord bot token:
   ```bash
   # macOS/Linux
   export DISCORD_BOT_TOKEN="your_token_here"
   
   # Windows PowerShell
   $env:DISCORD_BOT_TOKEN="your_token_here"
   ```

3. Run the test script:
   ```bash
   python discord_bot_setup_test.py
   ```

4. If successful, you'll see a message confirming the bot has connected to Discord

## Testing Bot Commands

Once connected, you can test both the traditional prefix commands and the new slash commands:

### Test Prefix Commands (using !)

These are the original commands from your bot:

- `!bike harley davidson` - Search for motorcycles
- `!makes` - List all manufacturers
- `!models Harley-Davidson` - List models for a specific make
- `!years Harley-Davidson Sportster` - List available years
- `!addbike Harley-Davidson Sportster 2010` - Add a bike role
- `!mybikes` - List your bike roles

### Test Slash Commands

These are the new application commands that use Discord's slash command system:

- `/search` - Search for motorcycles with an interactive response
- `/addbike` - Add a bike role through a dropdown menu interface
- `/checkpermissions` - Verify that the bot has proper permissions

## Verifying Bot Settings

To confirm that your bot is properly configured with the settings you provided:

1. In the Discord Developer Portal, check that:
   - The bot name is set to "bikerole"
   - The description mentions motorcycle and bike database features
   - All five tags are applied (bikes, motorcycles, bicycles, ebikes, motorbikes)
   - Privacy Policy and Terms of Service URLs are set
   
2. In your Discord server, check that:
   - The bot appears with the correct name and profile
   - The bot responds to both prefix and slash commands
   - The bot can create and assign roles when using bike commands

## Common Issues

- **Application Commands Not Appearing**: It can take up to an hour for slash commands to propagate. Try using the `/checkpermissions` command first.
- **Role Assignment Failing**: Make sure the bot's highest role is positioned above any roles it needs to assign.
- **Permission Issues**: Use the `/checkpermissions` command to verify the bot has all needed permissions.

## Next Steps

After confirming your bot works with the basic test commands, you can:

1. Add more slash commands to improve user experience
2. Integrate with your server's existing role system
3. Set up role colors based on motorcycle categories or manufacturers
4. Create custom embeds for displaying motorcycle information
