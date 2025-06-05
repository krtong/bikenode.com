#!/usr/bin/env python3
"""
JSON-based script for Claude to respond to Discord messages
Handles all special characters properly
"""
import json
import sys
import os
from datetime import datetime

def add_response(message_id, response_text):
    """Add a response to a specific message"""
    # Load messages
    if not os.path.exists('claude_messages.json'):
        print("Error: No messages file found")
        return False
    
    with open('claude_messages.json', 'r') as f:
        messages = json.load(f)
    
    # Find the message
    message = None
    for msg in messages:
        if msg['id'] == message_id:
            message = msg
            break
    
    if not message:
        print(f"Error: Message ID {message_id} not found")
        return False
    
    # Mark message as responded
    message['responded'] = True
    
    # Save updated messages
    with open('claude_messages.json', 'w') as f:
        json.dump(messages, f, indent=2)
    
    # Load or create responses file
    try:
        with open('claude_responses.json', 'r') as f:
            responses = json.load(f)
    except:
        responses = []
    
    # Add response
    response_data = {
        'id': len(responses) + 1,
        'message_id': message_id,
        'channel_id': message['channel_id'],
        'user_id': message['user_id'],
        'original_message': message['message'],
        'response': response_text,
        'timestamp': datetime.now().isoformat()
    }
    
    responses.append(response_data)
    
    # Save responses
    with open('claude_responses.json', 'w') as f:
        json.dump(responses, f, indent=2)
    
    print(f"✅ Response saved for message ID {message_id}")
    print(f"Channel: {message['channel_id']}")
    print(f"User: {message['username']}")
    return True

def list_pending():
    """List all pending messages"""
    if not os.path.exists('claude_messages.json'):
        print("No messages file found")
        return
    
    with open('claude_messages.json', 'r') as f:
        messages = json.load(f)
    
    pending = [m for m in messages if not m.get('responded', False)]
    
    if not pending:
        print("No pending messages")
        return
    
    print(f"\n📨 {len(pending)} Pending Messages:\n")
    for msg in pending:
        print(f"ID: {msg['id']} - {msg['username']}: {msg['message'][:50]}...")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python respond_json.py <message_id> <response>")
        print("  python respond_json.py --list")
        print("\nExamples:")
        print('  python respond_json.py 1 "Hello! Python is a programming language..."')
        print("  python respond_json.py --list")
        return
    
    if sys.argv[1] == "--list":
        list_pending()
    else:
        try:
            message_id = int(sys.argv[1])
            response = " ".join(sys.argv[2:])
            
            if not response:
                print("Error: Response cannot be empty")
                return
                
            add_response(message_id, response)
        except ValueError:
            print("Error: Message ID must be a number")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()