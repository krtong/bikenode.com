#!/usr/bin/env python3
"""
Simple script for Claude to respond to Discord messages
"""
import sys
from datetime import datetime

def add_response(channel_id, user_id, original_msg, response_text):
    """Add a response to the responses file"""
    with open('claude_responses.txt', 'a') as f:
        response_line = f"{datetime.now().isoformat()}|{channel_id}|{user_id}|{original_msg}|{response_text}\n"
        f.write(response_line)
    print(f"✅ Response saved for channel {channel_id}")

def main():
    if len(sys.argv) < 5:
        print("Usage: python respond.py <channel_id> <user_id> <original_message> <response>")
        print("\nExample:")
        print('python respond.py 123456789 987654321 "What is Python?" "Python is a programming language..."')
        return
    
    channel_id = sys.argv[1]
    user_id = sys.argv[2]
    original_msg = sys.argv[3]
    response = " ".join(sys.argv[4:])
    
    add_response(channel_id, user_id, original_msg, response)

if __name__ == "__main__":
    main()