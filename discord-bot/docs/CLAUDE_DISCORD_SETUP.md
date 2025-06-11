# Claude Code Discord Integration

This integration allows you to use Claude Code through Discord, with real-time progress updates showing Claude's thought process as it works on your requests.

## Available Commands

### Basic Chat Commands
- `!bike chat <message>` - Send a message to Claude and see real-time progress
- `!bike chat_history` - View conversation history in current channel
- `!bike chat_clear` - Clear conversation history

### Simple Message Commands (Alternative)
- `!bike claude <message>` - Send a one-off message to Claude
- `!bike claude_check [id]` - Check for responses
- `!bike claude_list` - List recent messages

## How It Works

1. **You send a message in Discord:**
   ```
   !bike chat Can you help me write a Python function to calculate fibonacci numbers?
   ```

2. **Discord shows real-time progress:**
   - "Analyzing your request..."
   - "Preparing to write code..."
   - "Writing code..."
   - Final response with the code

3. **Claude processes your message** using the `claude_interface.py` script

## Running the System

### Step 1: Start the Discord Bot
```bash
cd discord-bot
/usr/bin/python3 launch.py
```

### Step 2: Run Claude Interface (in another terminal)
```bash
cd discord-bot

# Interactive mode (recommended)
/usr/bin/python3 claude_interface.py

# Or auto mode (processes all messages automatically)
/usr/bin/python3 claude_interface.py --auto
```

## Example Conversation

**You:** `!bike chat Write a function to reverse a string`

**Bot shows progress:**
```
💬 Message Received
Processing your message...

🔄 Claude is working...
Analyzing your request...
Status: ⏳ Understanding the context

🔄 Claude is working...
Preparing to write code...
Status: ⏳ Setting up development environment

🔄 Claude is working...
Writing code...
Status: ⏳ Creating the solution

✅ Claude's Response
I'll help you with that coding request!

Here's what I've created:

```python
def reverse_string(s):
    """Reverse a string using Python's slicing"""
    return s[::-1]

# Example usage
text = "Hello World"
reversed_text = reverse_string(text)
print(reversed_text)  # Output: "dlroW olleH"
```

This code demonstrates the basic structure. Let me know if you need any modifications!
```

## Features

- **Real-time Updates**: See what Claude is doing as it processes your request
- **Conversation History**: Maintains context within a channel
- **Progress Tracking**: Visual indicators show the status of your request
- **Code Formatting**: Responses include properly formatted code blocks
- **Multi-channel Support**: Each Discord channel has its own conversation

## Tips

1. Use `!bike chat` for ongoing conversations where you want to see progress
2. Use `!bike claude` for simple one-off questions
3. The bot remembers context within a channel until you use `!bike chat_clear`
4. Claude Interface can run in auto mode for hands-free operation

## Troubleshooting

- If messages aren't being processed, check that `claude_interface.py` is running
- If the bot doesn't respond, restart it and check the logs
- Make sure both the bot and interface have access to the `data/` directory