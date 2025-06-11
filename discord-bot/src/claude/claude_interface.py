#!/usr/bin/env python3
"""
Claude Interface for Discord Bot
This allows Claude to process messages and send responses with progress updates.
"""
import json
import os
import sys
import time
from datetime import datetime

CONVERSATIONS_FILE = "data/claude_conversations.json"
UPDATES_FILE = "data/claude_updates.json"

def load_json(filename):
    """Load JSON file"""
    if not os.path.exists(filename):
        return {}
    with open(filename, 'r') as f:
        return json.load(f)

def save_json(filename, data):
    """Save JSON file"""
    os.makedirs("data", exist_ok=True)
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

def get_pending_messages():
    """Get all pending messages across all conversations"""
    conversations = load_json(CONVERSATIONS_FILE)
    updates = load_json(UPDATES_FILE)
    
    pending = []
    for channel_id, conv in conversations.items():
        for msg in conv["messages"]:
            key = f"{channel_id}_{msg['id']}"
            if key in updates and updates[key]["status"] == "pending":
                pending.append({
                    "channel_id": channel_id,
                    "message_id": msg["id"],
                    "user": msg["user"],
                    "message": msg["message"],
                    "timestamp": msg["timestamp"],
                    "key": key
                })
    
    return pending

def add_progress_update(key, update_text, detail=None):
    """Add a progress update that Discord will show"""
    updates = load_json(UPDATES_FILE)
    
    if key in updates:
        update = {
            "type": "progress",
            "content": update_text,
            "detail": detail,
            "timestamp": datetime.now().isoformat()
        }
        updates[key]["updates"].append(update)
        save_json(UPDATES_FILE, updates)
        print(f"📊 Progress: {update_text}")
        if detail:
            print(f"   Detail: {detail}")

def add_response(key, response_text):
    """Add the final response"""
    updates = load_json(UPDATES_FILE)
    
    if key in updates:
        update = {
            "type": "response",
            "content": response_text,
            "timestamp": datetime.now().isoformat()
        }
        updates[key]["updates"].append(update)
        updates[key]["status"] = "completed"
        save_json(UPDATES_FILE, updates)
        print(f"✅ Response sent!")

def simulate_claude_work(message_data):
    """Simulate Claude working on a task with progress updates"""
    key = message_data["key"]
    message = message_data["message"]
    
    # Initial analysis
    add_progress_update(key, "Analyzing your request...", "Understanding the context")
    time.sleep(1)
    
    # Check if it's a coding request
    if any(word in message.lower() for word in ["code", "function", "script", "program", "fix", "debug"]):
        add_progress_update(key, "Preparing to write code...", "Setting up development environment")
        time.sleep(1)
        
        add_progress_update(key, "Writing code...", "Creating the solution")
        time.sleep(2)
        
        # Generate a sample response
        response = f"""I'll help you with that coding request!

Here's what I've created:

```python
# Based on your request: {message[:50]}...
def example_function():
    # This is a demonstration
    return "Hello from Claude Code via Discord!"
```

This code demonstrates the basic structure. Let me know if you need any modifications!"""
        
    else:
        add_progress_update(key, "Processing your message...", "Formulating response")
        time.sleep(1)
        
        response = f"I received your message: '{message}'\n\nThis is Claude responding through the Discord bot integration. How can I help you further?"
    
    add_response(key, response)

def interactive_mode():
    """Interactive mode for processing messages"""
    print("🤖 Claude Discord Interface")
    print("=" * 50)
    
    while True:
        pending = get_pending_messages()
        
        if not pending:
            print("\n✅ No pending messages. Waiting...")
            time.sleep(5)
            continue
        
        print(f"\n📨 Found {len(pending)} pending message(s):")
        for i, msg in enumerate(pending):
            print(f"\n[{i+1}] From: {msg['user']}")
            print(f"    Channel: {msg['channel_id']}")
            print(f"    Message: {msg['message']}")
        
        print("\nOptions:")
        print("  [1-9] Process message")
        print("  [a]   Process all")
        print("  [r]   Refresh")
        print("  [q]   Quit")
        
        choice = input("\nYour choice: ").strip().lower()
        
        if choice == 'q':
            break
        elif choice == 'r':
            continue
        elif choice == 'a':
            for msg in pending:
                print(f"\n🔄 Processing message from {msg['user']}...")
                simulate_claude_work(msg)
        elif choice.isdigit() and 1 <= int(choice) <= len(pending):
            msg = pending[int(choice) - 1]
            print(f"\n🔄 Processing message from {msg['user']}...")
            simulate_claude_work(msg)

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--auto":
        # Auto mode - process all pending messages
        print("🤖 Running in auto mode...")
        while True:
            pending = get_pending_messages()
            for msg in pending:
                print(f"\n🔄 Processing message from {msg['user']}...")
                simulate_claude_work(msg)
            time.sleep(5)
    else:
        # Interactive mode
        interactive_mode()

if __name__ == "__main__":
    main()