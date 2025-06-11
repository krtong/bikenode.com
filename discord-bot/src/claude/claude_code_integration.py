#!/usr/bin/env python3
"""
Claude Code Integration for Discord Bot
This script allows Claude Code to monitor Discord messages and respond automatically.
"""

import json
import os
import time
import asyncio
import subprocess
from datetime import datetime
from pathlib import Path
import signal
import sys

class ClaudeCodeIntegration:
    def __init__(self):
        self.messages_file = "claude_messages.json"
        self.responses_file = "claude_responses.json"
        self.last_processed_id = 0
        self.running = True
        self.bot_process = None
        
        # Ensure files exist
        self.ensure_files()
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def ensure_files(self):
        """Ensure JSON files exist"""
        for file in [self.messages_file, self.responses_file]:
            if not os.path.exists(file):
                with open(file, 'w') as f:
                    json.dump([], f)
    
    def signal_handler(self, signum, frame):
        """Handle shutdown gracefully"""
        print("\n🔄 Shutting down Claude Code integration...")
        self.running = False
        if self.bot_process:
            self.bot_process.terminate()
        sys.exit(0)
    
    def start_discord_bot(self):
        """Start the Discord bot"""
        print("🚀 Starting Discord bot...")
        try:
            self.bot_process = subprocess.Popen(
                ["/usr/bin/python3", "bot.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            time.sleep(3)  # Give bot time to start
            if self.bot_process.poll() is None:
                print("✅ Discord bot started successfully")
                return True
            else:
                print("❌ Discord bot failed to start")
                return False
        except Exception as e:
            print(f"❌ Error starting bot: {e}")
            return False
    
    def read_new_messages(self):
        """Read new messages from Discord"""
        try:
            with open(self.messages_file, 'r') as f:
                messages = json.load(f)
            
            # Filter for new messages
            new_messages = [
                msg for msg in messages 
                if msg['id'] > self.last_processed_id and not msg.get('responded', False)
            ]
            
            if new_messages:
                self.last_processed_id = max(msg['id'] for msg in new_messages)
            
            return new_messages
            
        except Exception as e:
            print(f"Error reading messages: {e}")
            return []
    
    def respond_to_message(self, message):
        """Process a message and generate a response"""
        user_message = message['message']
        username = message['username']
        
        print(f"\n💬 New message from {username}: {user_message}")
        
        # Create a notification file that Claude Code can detect
        notification_file = "claude_notification.txt"
        with open(notification_file, 'w') as f:
            f.write(f"NEW_MESSAGE|{message['id']}|{username}|{user_message}")
        
        print("⏳ Waiting for Claude Code to process the message...")
        
        # Wait for Claude Code to process and respond
        response_check_file = f"claude_response_{message['id']}.txt"
        max_wait = 30  # seconds
        wait_time = 0
        
        while wait_time < max_wait:
            if os.path.exists(response_check_file):
                with open(response_check_file, 'r') as f:
                    response_text = f.read()
                os.remove(response_check_file)  # Clean up
                if os.path.exists(notification_file):
                    os.remove(notification_file)
                return response_text
            
            time.sleep(1)
            wait_time += 1
        
        # Timeout - no response received
        if os.path.exists(notification_file):
            os.remove(notification_file)
        return "⏱️ Claude Code hasn't responded yet. The message has been queued."
    
    def save_response(self, original_message, response_text):
        """Save response to file for Discord bot to read"""
        try:
            # Load existing responses
            with open(self.responses_file, 'r') as f:
                responses = json.load(f)
            
            # Create response object
            response_data = {
                'message_id': original_message['id'],
                'timestamp': datetime.now().isoformat(),
                'channel_id': original_message['channel_id'],
                'user_id': original_message['user_id'],
                'username': original_message['username'],
                'original_message': original_message['message'],
                'response': response_text
            }
            
            # Add response
            responses.append(response_data)
            
            # Save to file
            with open(self.responses_file, 'w') as f:
                json.dump(responses, f, indent=2)
            
            # Mark original message as responded
            with open(self.messages_file, 'r') as f:
                messages = json.load(f)
            
            for msg in messages:
                if msg['id'] == original_message['id']:
                    msg['responded'] = True
                    break
            
            with open(self.messages_file, 'w') as f:
                json.dump(messages, f, indent=2)
            
            print(f"✅ Response saved for message ID {original_message['id']}")
            
        except Exception as e:
            print(f"Error saving response: {e}")
    
    def monitor_loop(self):
        """Main monitoring loop"""
        print("👁️  Monitoring for Discord messages...")
        print("💡 Send messages using /claude in Discord")
        print("🔄 Press Ctrl+C to stop")
        
        while self.running:
            try:
                new_messages = self.read_new_messages()
                
                for message in new_messages:
                    response = self.respond_to_message(message)
                    self.save_response(message, response)
                
                time.sleep(2)  # Check every 2 seconds
                
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Error in monitoring loop: {e}")
                time.sleep(5)
    
    def run(self):
        """Main entry point"""
        print("🤖 Claude Code Discord Integration")
        print("=" * 40)
        
        # Start Discord bot
        if not self.start_discord_bot():
            print("❌ Failed to start Discord bot. Exiting.")
            return
        
        try:
            # Start monitoring
            self.monitor_loop()
        finally:
            if self.bot_process:
                self.bot_process.terminate()
                print("🔄 Discord bot stopped")

def main():
    integration = ClaudeCodeIntegration()
    integration.run()

if __name__ == "__main__":
    main()