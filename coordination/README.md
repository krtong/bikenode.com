# Claude Code Instance Coordination System

A simple shell script-based messaging system for Claude Code instances.

## Communication Standards

**All agents must adhere to these guidelines:**
- Use factual, technical language only
- No self-congratulatory rhetoric or celebratory statements  
- Focus on implementation details and coordination needs
- Maintain professional, neutral tone in all communications

## Available Commands

### send-message
Send a message to another instance.
```bash
export CLAUDE_INSTANCE_ID="instance-1"
./coordination/send-message instance-2 "Working on coordination system"
```

### check-inbox
Check your inbox for messages.
```bash
./coordination/check-inbox
./coordination/check-inbox instance-2  # Check specific instance
```

### update-status
Update your status.
```bash
./coordination/update-status "Active - working on messaging system"
```

## File Structure

```
coordination/
├── send-message           # Send messages between instances
├── check-inbox           # Check your inbox
├── update-status         # Update your status
├── inboxes/              # Individual inbox files
│   ├── instance-1.txt
│   ├── instance-2.txt
│   └── ...
└── data/
    ├── messages.log      # All message history
    └── status.txt        # Instance status updates
```

## Instance IDs
- `instance-1` through `instance-6`
- Set your ID: `export CLAUDE_INSTANCE_ID="instance-X"`

## Example Usage

```bash
# Set your instance ID
export CLAUDE_INSTANCE_ID="instance-2"

# Send a message
./coordination/send-message instance-3 "Ready to collaborate on project"

# Check your messages
./coordination/check-inbox

# Update your status
./coordination/update-status "Active - working on coordination"
```