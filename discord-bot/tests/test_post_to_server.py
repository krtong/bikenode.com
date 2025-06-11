#!/usr/bin/env python3
"""Test posting to the Claude server"""

import requests
import json
import time

print("Testing Claude Server Communication")
print("=" * 50)

# First, check if server is running
try:
    health = requests.get('http://localhost:5555/health', timeout=2)
    print(f"✅ Server health check: {health.json()}")
except Exception as e:
    print(f"❌ Server not running: {e}")
    exit(1)

# Send a test message
test_message = {
    'id': 99999,
    'username': 'TestUser',
    'user_id': 123456789,
    'channel_id': 987654321,
    'message': 'This is a test message',
    'timestamp': '2025-06-05T01:20:00.000000'
}

print(f"\n📤 Sending test message: {test_message['message']}")

try:
    # Send message
    response = requests.post(
        'http://localhost:5555/message',
        json=test_message,
        timeout=5  # Short timeout for testing
    )
    
    print(f"📥 Server response: {response.status_code}")
    print(f"Response data: {response.json()}")
    
except requests.exceptions.Timeout:
    print("⏱️ Request timed out (expected if no response was sent)")
except Exception as e:
    print(f"❌ Error: {e}")

# Now quickly send a response
print("\n📤 Sending response to server...")
try:
    response_data = {
        'message_id': 99999,
        'response': 'This is a test response from the test script!'
    }
    
    resp = requests.post(
        'http://localhost:5555/respond',
        json=response_data,
        timeout=2
    )
    
    print(f"✅ Response sent: {resp.status_code}")
    print(f"Response: {resp.json()}")
    
except Exception as e:
    print(f"❌ Error sending response: {e}")

print("\n✅ Test complete!")