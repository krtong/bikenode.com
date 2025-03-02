# Setting Up and Testing the Discord Bot

This guide will walk you through the process of setting up and testing the Discord bike lookup bot.

## Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](c)
2. Click on "New Application" in the top right corner
3. Enter a name for your application (e.g., "BikeNode Bot") and click "Create"
4. Go to the "Bot" tab in the left sidebar
5. Click "Add Bot" and confirm by clicking "Yes, do it!"

## Step 2: Configure Bot Permissions

1. Still in the "Bot" tab, scroll down to "Privileged Gateway Intents"
2. Enable "SERVER MEMBERS INTENT" (needed to track member roles)
3. Enable "MESSAGE CONTENT INTENT" (needed to process message commands)
4. Save your changes

## Step 3: Get Your Bot Token

1. In the "Bot" tab, find the "TOKEN" section
2. Click "Copy" to copy your bot token
3. **Important**: Keep this token secret! It provides full access to your bot.

## Step 4: Invite the Bot to Your Server

1. Go to the "OAuth2" tab in the left sidebar, then select "URL Generator"
2. Under "Scopes", select "bot"
3. Under "Bot Permissions", select:
   - "Manage Roles" (to create/assign bike roles)
   - "Send Messages" (to respond to commands)
   - "Read Message History"
   - "Add Reactions"
4. Copy the generated URL at the bottom of the page
5. Open the URL in your browser
6. Select the server you want to add the bot to and click "Authorize"
   (Note: You need "Manage Server" permissions to add bots to a server)

## Step 5: Run the Bot

1. Set your bot token as an environment variable:
   ```bash
   # On macOS/Linux
   export DISCORD_BOT_TOKEN="your_token_here"
   
   # On Windows PowerShell
   $env:DISCORD_BOT_TOKEN="your_token_here"
   
   # On Windows Command Prompt
   set DISCORD_BOT_TOKEN=your_token_here
   ```

2. Navigate to the project directory and run the bot:
   ```bash
   cd /Users/kevintong/Documents/Code/bikenode.com/data
   python discord_bot_example.py
   ```

3. If everything is set up correctly, you should see a message like:
   ```
   BikeNode Bot has connected to Discord!
   ```

## Step 6: Test the Bot Commands

Once your bot is running and connected to your server, you can test the following commands:

- `!bike harley davidson` - Search for Harley Davidson motorcycles
- `!makes` - List all motorcycle manufacturers
- `!models Harley-Davidson` - List all models for Harley-Davidson
- `!years Harley-Davidson Sportster` - List all years for the Harley-Davidson Sportster
- `!addbike Harley-Davidson Sportster 2010` - Add the 2010 Harley-Davidson Sportster role to yourself
- `!removebike Harley-Davidson Sportster 2010` - Remove the role
- `!mybikes` - List all your bike roles

## Troubleshooting

- **Bot doesn't respond to commands**: Ensure you're using the correct prefix (`!`) and that the bot has the necessary permissions to see and respond in the channel.
- **Role creation fails**: Check that the bot's role is positioned higher in the server's role hierarchy than the roles it's trying to create.
- **Bot disconnects**: Check your internet connection and ensure your bot token is correct.
- **Missing bikes in database**: Check that the CSV files are properly loaded and formatted.

## Next Steps

- Consider extending the bot with additional commands
- Add support for motorcycle pictures or specifications
- Implement role colors based on motorcycle categories
- Add user verification for owned motorcycles with photo proof
