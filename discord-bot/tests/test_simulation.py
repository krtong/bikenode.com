#!/usr/bin/env python3
"""
Simulate Discord command tests without actually running Discord
"""
import json
import os
from datetime import datetime

def simulate_message(message_text, channel_id=123456789, user_id=987654321, username="TestUser"):
    """Simulate saving a message like the Discord bot would"""
    # Load existing messages
    try:
        with open('claude_messages.json', 'r') as f:
            messages = json.load(f)
    except:
        messages = []
    
    # Create message object
    msg_data = {
        'id': len(messages) + 1,
        'timestamp': datetime.now().isoformat(),
        'channel_id': channel_id,
        'user_id': user_id,
        'username': username,
        'message': message_text,
        'responded': False
    }
    
    # Append and save
    messages.append(msg_data)
    with open('claude_messages.json', 'w') as f:
        json.dump(messages, f, indent=2)
    
    print(f"✅ Simulated message saved: ID {msg_data['id']}")
    return msg_data['id']

def test_special_characters():
    """Test various special character scenarios"""
    test_cases = [
        "Hello Claude, this is a simple test",
        "Can you handle pipes | in messages?",
        "Multiple ||| pipes ||| test",
        """First line
Second line
Third line""",
        "Testing emojis 🚀 🎉 😊 🔥",
        'Testing "double quotes" and \'single quotes\'',
        "JSON chars: {}, [], backslash \\",
        "**Bold** *italic* `code` ~~strikethrough~~",
        "Very long message: " + "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 20
    ]
    
    print("🧪 Testing Special Characters...")
    for i, test_msg in enumerate(test_cases, 1):
        msg_id = simulate_message(test_msg)
        print(f"Test {i}: {test_msg[:50]}... -> ID {msg_id}")
    
    return len(test_cases)

def test_multi_channel():
    """Test multi-channel isolation"""
    print("\n🧪 Testing Multi-Channel...")
    simulate_message("Message from Channel A", channel_id=111111111, username="UserA")
    simulate_message("Message from Channel B", channel_id=222222222, username="UserB")
    simulate_message("Another from Channel A", channel_id=111111111, username="UserA")

def test_responses():
    """Test response functionality"""
    print("\n🧪 Testing Response System...")
    
    # Respond to a few messages
    import sys
    sys.argv = ['respond_json.py', '1', 'Hello! This is my response to your simple test.']
    exec(open('respond_json.py').read())
    
    sys.argv = ['respond_json.py', '2', 'Yes, I can handle pipes | perfectly now with JSON!']
    exec(open('respond_json.py').read())

def main():
    print("🚀 Running Automated Tests...\n")
    
    # Clear existing files
    for file in ['claude_messages.json', 'claude_responses.json']:
        if os.path.exists(file):
            os.remove(file)
    
    # Run tests
    num_tests = test_special_characters()
    test_multi_channel()
    test_responses()
    
    print(f"\n📊 Test Summary:")
    print(f"Messages created: {num_tests + 3}")
    print(f"Responses added: 2")
    
    # Verify with read script
    print("\n📖 Reading messages:")
    os.system('python read_messages_json.py')

if __name__ == "__main__":
    main()