#!/usr/bin/env python3
"""
Simple script for Claude to respond to Discord messages
"""
import json
import sys
from datetime import datetime

def respond(msg_id, response_text):
    """Add a response for a specific message"""
    # Load the queue to get message details
    try:
        with open('claude_queue.json', 'r') as f:
            queue = json.load(f)
    except:
        print("Error: Could not read message queue")
        return False
    
    if msg_id not in queue:
        print(f"Error: Message ID '{msg_id}' not found in queue")
        return False
    
    original = queue[msg_id]
    
    # Load existing responses
    try:
        with open('claude_responses.json', 'r') as f:
            responses = json.load(f)
    except:
        responses = {}
    
    # Add the response
    responses[msg_id] = {
        "id": msg_id,
        "channel_id": original["channel_id"],
        "original_message": original["message"],
        "response": response_text,
        "response_time": datetime.now().isoformat(),
        "delivered": False
    }
    
    # Save responses
    with open('claude_responses.json', 'w') as f:
        json.dump(responses, f, indent=2)
    
    print(f"✅ Response saved for message {msg_id}")
    print(f"The Discord bot will deliver it to channel {original['channel_id']}")
    return True

def main():
    if len(sys.argv) < 3:
        print("Usage: python claude_respond.py <message_id> <response>")
        print("\nExample:")
        print('python claude_respond.py "12345_1234567.89" "Here is my response to your question..."')
        return
    
    msg_id = sys.argv[1]
    response = " ".join(sys.argv[2:])
    
    respond(msg_id, response)

if __name__ == "__main__":
    main()