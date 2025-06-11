#!/usr/bin/env python3
"""
Claude Code Monitor - Real-time Discord integration
Run this to monitor Discord messages and respond automatically
"""

import json
import os
import time
from datetime import datetime
import sys

class ClaudeMonitor:
    def __init__(self):
        self.messages_file = "claude_messages.json"
        self.responses_file = "claude_responses.json"
        self.last_processed_id = self.get_last_processed_id()
        print(f"🔄 Starting from message ID: {self.last_processed_id}")
    
    def get_last_processed_id(self):
        """Get the last processed message ID"""
        try:
            if os.path.exists(self.responses_file):
                with open(self.responses_file, 'r') as f:
                    responses = json.load(f)
                    if responses:
                        return max(r['message_id'] for r in responses)
        except:
            pass
        return 0
    
    def check_for_new_messages(self):
        """Check for new unprocessed messages"""
        try:
            with open(self.messages_file, 'r') as f:
                messages = json.load(f)
            
            new_messages = [
                msg for msg in messages 
                if msg['id'] > self.last_processed_id and not msg.get('responded', False)
            ]
            
            return new_messages
        except Exception as e:
            return []
    
    def process_message(self, message):
        """Process a message and return response"""
        user_message = message['message'].lower()
        username = message['username']
        
        # Claude Code processes the message here
        print(f"\n📨 Processing message from {username}: {message['message']}")
        
        # Generate appropriate response based on the message
        if 'hello' in user_message or 'hi' in user_message:
            return f"Hello {username}! 👋 I'm Claude Code, ready to help you with coding tasks through Discord!"
        
        elif 'help' in user_message:
            return ("I can help you with:\n"
                   "• File operations (read, write, edit)\n"
                   "• Running commands\n"
                   "• Code analysis and debugging\n"
                   "• Creating new scripts\n"
                   "• And much more!\n\n"
                   "Just tell me what you need!")
        
        elif 'test' in user_message:
            return "✅ Test successful! The Claude Code integration is working perfectly!"
        
        else:
            # For now, acknowledge the message
            return (f"I received your message: '{message['message']}'\n\n"
                   f"In a full implementation, I would process this request and perform the requested action. "
                   f"For now, this is a demonstration of the real-time monitoring system.")
    
    def save_response(self, message, response_text):
        """Save response to JSON file"""
        try:
            # Load existing responses
            responses = []
            if os.path.exists(self.responses_file):
                with open(self.responses_file, 'r') as f:
                    responses = json.load(f)
            
            # Add new response
            response_data = {
                'message_id': message['id'],
                'timestamp': datetime.now().isoformat(),
                'channel_id': message['channel_id'],
                'user_id': message['user_id'],
                'username': message['username'],
                'original_message': message['message'],
                'response': response_text
            }
            responses.append(response_data)
            
            # Save responses
            with open(self.responses_file, 'w') as f:
                json.dump(responses, f, indent=2)
            
            # Mark message as responded
            with open(self.messages_file, 'r') as f:
                messages = json.load(f)
            
            for msg in messages:
                if msg['id'] == message['id']:
                    msg['responded'] = True
                    break
            
            with open(self.messages_file, 'w') as f:
                json.dump(messages, f, indent=2)
            
            self.last_processed_id = message['id']
            print(f"✅ Response saved for message ID {message['id']}")
            
        except Exception as e:
            print(f"❌ Error saving response: {e}")
    
    def run(self):
        """Main monitoring loop"""
        print("🤖 Claude Code Discord Monitor Active")
        print("=" * 50)
        print("📡 Monitoring for Discord messages...")
        print("💬 Send messages using /claude in Discord")
        print("🔄 Press Ctrl+C to stop")
        print("=" * 50)
        
        try:
            while True:
                new_messages = self.check_for_new_messages()
                
                if new_messages:
                    for msg in new_messages:
                        response = self.process_message(msg)
                        self.save_response(msg, response)
                        print(f"💬 Responded to {msg['username']}")
                else:
                    # Show we're still alive
                    print(".", end="", flush=True)
                
                time.sleep(2)  # Check every 2 seconds
                
        except KeyboardInterrupt:
            print("\n\n👋 Claude Code Monitor stopped")
            sys.exit(0)

if __name__ == "__main__":
    monitor = ClaudeMonitor()
    monitor.run()