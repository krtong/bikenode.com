# Minimal Mode

The bot can now run in minimal mode, which only loads the Claude commands without other features.

## Usage

Set the environment variable `MINIMAL_MODE=true` before starting the bot:

```bash
export MINIMAL_MODE=true
python main.py
```

Or in one line:
```bash
MINIMAL_MODE=true python main.py
```

## Features in Minimal Mode

- Only Claude commands are loaded (`claude_fixed.py`)
- No API client initialization
- No webhook handler
- No motorcycle data loading
- No other command cogs (bike, stats, compare, etc.)

This is useful for testing Claude integration in isolation or running a lightweight bot instance.