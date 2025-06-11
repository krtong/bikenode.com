#!/usr/bin/env python3
"""Test Discord bot's ability to post messages by simulating the full flow"""

import requests
import json
import time
import threading

def quick_responder(message_id):
    """Respond quickly to the message"""
    time.sleep(2)  # Wait 2 seconds then respond
    
    response_data = {
        'message_id': message_id,
        'response': '🤖 This is a test response from the automated test! If you see this in Discord, the posting mechanism works correctly.'
    }
    
    try:
        resp = requests.post(
            'http://localhost:5555/respond',
            json=response_data,
            timeout=2
        )
        print(f"✅ Auto-response sent: {resp.status_code}")
    except Exception as e:
        print(f"❌ Error sending auto-response: {e}")

# Test message that simulates what Discord bot sends
test_message = {
    'id': 88888,
    'username': 'TestBot',
    'user_id': 123456789,
    'channel_id': 1378142017619628073,  # Use real channel ID
    'message': 'Automated test message - testing Discord posting',
    'timestamp': '2025-06-05T01:50:00.000000'
}

print("🧪 Testing Discord Bot Posting Ability")
print("=" * 50)
print(f"Sending test message: {test_message['message']}")

# Start auto-responder thread
responder_thread = threading.Thread(target=quick_responder, args=(test_message['id'],))
responder_thread.start()

try:
    # Send message to server (simulating Discord bot)
    response = requests.post(
        'http://localhost:5555/message',
        json=test_message,
        timeout=10
    )
    
    print(f"📥 Server response: {response.status_code}")
    data = response.json()
    print(f"Response data: {data}")
    
    if data.get('success'):
        print("✅ Test successful! The response mechanism works.")
        print("🔍 Check the server logs to see if the message was processed correctly.")
    else:
        print("❌ Test failed - no response received")
        
except Exception as e:
    print(f"❌ Test failed with error: {e}")

# Wait for responder thread
responder_thread.join()
print("\n✅ Test complete!")