#!/usr/bin/env python3
"""
Claude Code Active Monitor - Real Integration
This monitor displays messages and waits for Claude Code to respond
"""

import json
import os
import time
from datetime import datetime
import sys

class ClaudeActiveMonitor:
    def __init__(self):
        self.messages_file = "claude_messages.json"
        self.responses_file = "claude_responses.json"
        self.last_processed_id = self.get_last_processed_id()
        self.pending_message = None
    
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
    
    def display_message(self, message):
        """Display message for Claude Code to see"""
        print("\n" + "="*60)
        print("🆕 NEW DISCORD MESSAGE")
        print("="*60)
        print(f"From: {message['username']}")
        print(f"Message ID: {message['id']}")
        print(f"Channel ID: {message['channel_id']}")
        print(f"Time: {message['timestamp']}")
        print("-"*60)
        print(f"Message: {message['message']}")
        print("="*60)
        print("⏳ Waiting for Claude Code to respond...")
        print("💡 Claude Code: Read the message above and respond by editing")
        print(f"   claude_responses.json with message_id: {message['id']}")
        print("="*60)
        
        self.pending_message = message
    
    def check_for_response(self):
        """Check if Claude Code has responded"""
        if not self.pending_message:
            return False
        
        try:
            with open(self.responses_file, 'r') as f:
                responses = json.load(f)
            
            for resp in responses:
                if resp['message_id'] == self.pending_message['id']:
                    print(f"\n✅ Claude Code responded to message {self.pending_message['id']}!")
                    self.last_processed_id = self.pending_message['id']
                    self.pending_message = None
                    return True
            
            return False
        except:
            return False
    
    def run(self):
        """Main monitoring loop"""
        print("🤖 Claude Code Active Monitor")
        print("=" * 60)
        print("This monitor shows Discord messages for Claude Code to respond to")
        print("Claude Code will see the messages and can respond directly")
        print("=" * 60)
        
        try:
            while True:
                # If we're waiting for a response, check for it
                if self.pending_message:
                    if self.check_for_response():
                        print("Moving to next message...")
                        time.sleep(1)
                    else:
                        print(".", end="", flush=True)
                        time.sleep(2)
                        continue
                
                # Check for new messages
                new_messages = self.check_for_new_messages()
                
                if new_messages:
                    # Process the first new message
                    self.display_message(new_messages[0])
                else:
                    print(".", end="", flush=True)
                
                time.sleep(2)
                
        except KeyboardInterrupt:
            print("\n\n👋 Monitor stopped")
            sys.exit(0)

if __name__ == "__main__":
    monitor = ClaudeActiveMonitor()
    monitor.run()