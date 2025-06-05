#!/usr/bin/env python3
"""
Test script for Claude Discord integration
Run this after the bot is connected to Discord
"""
import json
import os
from datetime import datetime

def test_message_system():
    """Test the message storage and retrieval system"""
    print("🧪 Testing Claude Discord Integration")
    print("=" * 40)
    
    # Check if message files exist
    messages_file = 'claude_messages.json'
    responses_file = 'claude_responses.json'
    
    print("\n📁 Checking file system:")
    print(f"Messages file exists: {os.path.exists(messages_file)}")
    print(f"Responses file exists: {os.path.exists(responses_file)}")
    
    # Create test message
    test_message = {
        "id": 9999,
        "user": "TestUser",
        "user_id": "123456789",
        "channel": "test-channel",
        "channel_id": "987654321",
        "content": "Test message from integration test",
        "timestamp": datetime.now().isoformat(),
        "status": "pending"
    }
    
    print("\n📝 Creating test message...")
    
    # Load existing messages
    try:
        with open(messages_file, 'r') as f:
            messages = json.load(f)
    except:
        messages = []
    
    # Add test message
    messages.append(test_message)
    
    # Save messages
    with open(messages_file, 'w') as f:
        json.dump(messages, f, indent=2)
    
    print("✅ Test message created")
    print(f"Message ID: {test_message['id']}")
    print(f"Content: {test_message['content']}")
    
    print("\n🔍 Instructions for testing:")
    print("1. Run: python3 read_messages_json.py")
    print("   - You should see the test message")
    print("2. Run: python3 respond_json.py 9999 \"This is a test response\"")
    print("   - This will add a response")
    print("3. In Discord, use: !bike check 9999")
    print("   - You should see the test response")
    
    print("\n✅ Test setup complete!")

if __name__ == "__main__":
    test_message_system()