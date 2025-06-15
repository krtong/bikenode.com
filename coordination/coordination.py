#!/usr/bin/env python3
"""
Python Coordination System for Multi-Agent Communication
Replaces shell script system to eliminate manual confirmation requirements
"""

import os
import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Union

class CoordinationSystem:
    def __init__(self, instance_id: str = None):
        self.script_dir = Path(__file__).parent
        self.data_dir = self.script_dir / "data"
        self.read_status_dir = self.script_dir / "read-status"
        self.inboxes_dir = self.script_dir / "inboxes"
        
        # Get instance ID from environment or use provided
        self.instance_id = instance_id or os.environ.get("CLAUDE_INSTANCE_ID", "instance-1")
        
        # File paths
        self.messages_log = self.data_dir / "messages.log"
        self.action_log = self.data_dir / "action-log.txt"
        self.chatroom_status = self.data_dir / "chatroom-status.txt"
        self.read_receipts_log = self.data_dir / "read-receipts.log"
        self.read_status_file = self.read_status_dir / f"{self.instance_id}.txt"
        self.inbox_file = self.inboxes_dir / f"{self.instance_id}.txt"
        
        # Ensure directories exist
        self._setup_directories()
        
    def _setup_directories(self):
        """Create necessary directories and files with proper permissions"""
        for directory in [self.data_dir, self.read_status_dir, self.inboxes_dir]:
            directory.mkdir(exist_ok=True)
            
        # Create files if they don't exist and set permissions
        for file_path in [self.messages_log, self.action_log, self.chatroom_status, self.read_receipts_log]:
            if not file_path.exists():
                file_path.touch()
            os.chmod(file_path, 0o600)  # Secure permissions
            
        # Create read status and inbox files
        if not self.read_status_file.exists():
            self.read_status_file.touch()
        if not self.inbox_file.exists():
            self.inbox_file.touch()
    
    def log_action(self, action_type: str, details: str):
        """Log an action to the action log"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {self.instance_id} | {action_type} | {details}\n"
        
        with open(self.action_log, "a", encoding="utf-8") as f:
            f.write(log_entry)
    
    def send_message(self, target: str, message: str) -> str:
        """Send a message to a chatroom or instance"""
        # Validate inputs
        if not message.strip():
            raise ValueError("Message cannot be empty")
            
        if not target:
            raise ValueError("Target cannot be empty")
        
        # Generate message ID
        msg_id = str(uuid.uuid4())[:8]
        
        # Format timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Determine message format based on target
        if target.startswith("#"):
            # Chatroom message
            formatted_msg = f"[{timestamp}] {self.instance_id} -> {target}: {message}"
        elif target.startswith("@"):
            # Direct message (remove @ prefix for storage)
            recipient = target[1:]
            formatted_msg = f"[{timestamp}] {self.instance_id} -> {target}: {message}"
        else:
            # Regular message to chatroom
            formatted_msg = f"[{timestamp}] {self.instance_id} -> {target}: {message}"
        
        # Write to messages log
        with open(self.messages_log, "a", encoding="utf-8") as f:
            f.write(formatted_msg + "\n")
        
        # Log the action
        self.log_action("SEND_MESSAGE", f"To: {target} | ID: {msg_id}")
        
        return msg_id
    
    def check_notifications(self) -> Dict[str, int]:
        """Check for @mentions and system alerts in unread messages"""
        if not self.messages_log.exists():
            self.log_action("CHECK_NOTIFICATIONS", "Checked notifications: 0 mentions, 0 alerts")
            return {"mentions": 0, "alerts": 0, "total": 0}
        
        # Get total message count
        with open(self.messages_log, "r", encoding="utf-8") as f:
            total_messages = sum(1 for line in f if line.strip())
        
        if total_messages == 0:
            self.log_action("CHECK_NOTIFICATIONS", "Checked notifications: 0 mentions, 0 alerts")
            return {"mentions": 0, "alerts": 0, "total": 0}
        
        # Get read status
        read_messages = set()
        if self.read_status_file.exists():
            with open(self.read_status_file, "r", encoding="utf-8") as f:
                for line in f:
                    if ":" in line:
                        msg_num = line.split(":")[0].strip()
                        if msg_num.isdigit():
                            read_messages.add(int(msg_num))
        
        mentions_count = 0
        alerts_count = 0
        
        # Check each unread message
        with open(self.messages_log, "r", encoding="utf-8") as f:
            for msg_num, line in enumerate(f, 1):
                if msg_num not in read_messages:
                    # Check for @mentions
                    if f"@{self.instance_id}" in line:
                        mentions_count += 1
                    
                    # Check for system alerts
                    if any(keyword in line.lower() for keyword in ["alert", "urgent", "system:"]):
                        alerts_count += 1
        
        total_notifications = mentions_count + alerts_count
        
        # Log the action
        self.log_action("CHECK_NOTIFICATIONS", f"Checked notifications: {mentions_count} mentions, {alerts_count} alerts")
        
        return {
            "mentions": mentions_count,
            "alerts": alerts_count,
            "total": total_notifications
        }
    
    def get_unread_messages(self) -> List[Dict]:
        """Get all unread messages for this instance"""
        if not self.messages_log.exists():
            return []
        
        # Get read status
        read_messages = set()
        if self.read_status_file.exists():
            with open(self.read_status_file, "r", encoding="utf-8") as f:
                for line in f:
                    if ":" in line:
                        msg_num = line.split(":")[0].strip()
                        if msg_num.isdigit():
                            read_messages.add(int(msg_num))
        
        unread_messages = []
        with open(self.messages_log, "r", encoding="utf-8") as f:
            for msg_num, line in enumerate(f, 1):
                if msg_num not in read_messages and line.strip():
                    unread_messages.append({
                        "number": msg_num,
                        "content": line.strip()
                    })
        
        self.log_action("CHECK_UNREAD", "Checking all unread messages")
        return unread_messages
    
    def mark_message_read(self, msg_num: int):
        """Mark a specific message as read"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Add to read status file
        with open(self.read_status_file, "a", encoding="utf-8") as f:
            f.write(f"{msg_num}: read at {timestamp}\n")
        
        # Log to read receipts
        with open(self.read_receipts_log, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] READ-RECEIPT: {self.instance_id} read message {msg_num}\n")
        
        # Log the action
        self.log_action("MARK_READ", f"Message {msg_num} marked as read")
    
    def system_status(self) -> Dict:
        """Get comprehensive system status"""
        status = {
            "total_messages": 0,
            "unread_messages": 0,
            "active_chatrooms": 0,
            "recent_activity": []
        }
        
        # Count total messages
        if self.messages_log.exists():
            with open(self.messages_log, "r", encoding="utf-8") as f:
                status["total_messages"] = sum(1 for line in f if line.strip())
        
        # Count unread messages
        status["unread_messages"] = len(self.get_unread_messages())
        
        # Count active chatrooms
        if self.chatroom_status.exists():
            with open(self.chatroom_status, "r", encoding="utf-8") as f:
                for line in f:
                    if ":open:" in line:
                        status["active_chatrooms"] += 1
        
        # Get recent activity (last 10 actions)
        if self.action_log.exists():
            with open(self.action_log, "r", encoding="utf-8") as f:
                lines = f.readlines()
                status["recent_activity"] = [line.strip() for line in lines[-10:]]
        
        self.log_action("SYSTEM_STATUS", "Checking comprehensive system status")
        return status
    
    def update_status(self, new_status: str):
        """Update instance status"""
        if not new_status.strip():
            raise ValueError("Status cannot be empty")
        
        # Store status in instance-specific file
        status_file = self.data_dir / f"status_{self.instance_id}.txt"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with open(status_file, "w", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {new_status}")
        
        # Log the action
        self.log_action("UPDATE_STATUS", f"Status updated to: {new_status}")
        
        return True
    
    def create_chatroom(self, name: str, description: str) -> bool:
        """Create a new chatroom"""
        if not name.strip() or not description.strip():
            raise ValueError("Chatroom name and description cannot be empty")
        
        # Check if chatroom already exists
        if self.chatroom_status.exists():
            with open(self.chatroom_status, "r", encoding="utf-8") as f:
                for line in f:
                    if line.startswith(f"{name}:"):
                        raise ValueError(f"Chatroom '{name}' already exists")
        
        # Create chatroom entry
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"{name}:open:{self.instance_id}:{timestamp}:{timestamp}:\n"
        
        with open(self.chatroom_status, "a", encoding="utf-8") as f:
            f.write(entry)
        
        os.chmod(self.chatroom_status, 0o600)
        self.log_action("CHATROOM_CREATED", f"Created chatroom '{name}' with description: {description}")
        return True
    
    def close_chatroom(self, name: str, reason: str) -> bool:
        """Close a chatroom with reason"""
        if not name.strip() or not reason.strip():
            raise ValueError("Chatroom name and reason cannot be empty")
        
        if not self.chatroom_status.exists():
            raise ValueError("No chatrooms exist")
        
        # Read and update chatroom status
        lines = []
        chatroom_found = False
        
        with open(self.chatroom_status, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{name}:open:"):
                    # Close this chatroom
                    parts = line.strip().split(":")
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    new_line = f"{name}:closed:{parts[2]}:{parts[3]}:{timestamp}:{reason}\n"
                    lines.append(new_line)
                    chatroom_found = True
                else:
                    lines.append(line)
        
        if not chatroom_found:
            raise ValueError(f"Chatroom '{name}' not found or already closed")
        
        # Write back to file
        with open(self.chatroom_status, "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        os.chmod(self.chatroom_status, 0o600)
        self.log_action("CHATROOM_CLOSED", f"Closed chatroom '{name}' - Reason: {reason}")
        return True
    
    def search_messages(self, query: str, recent: int = None) -> List[Dict]:
        """Search messages by content"""
        if not query.strip():
            raise ValueError("Search query cannot be empty")
        
        if not self.messages_log.exists():
            return []
        
        results = []
        with open(self.messages_log, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
            # Apply recent filter if specified
            if recent:
                lines = lines[-recent:]
            
            for i, line in enumerate(lines, 1):
                if query.lower() in line.lower():
                    results.append({
                        "number": i,
                        "content": line.strip()
                    })
        
        self.log_action("SEARCH_MESSAGES", f"Searched for: {query}")
        return results
    
    def reply_to_message(self, msg_num: int, reply_text: str) -> str:
        """Reply to a specific message with threading"""
        if not reply_text.strip():
            raise ValueError("Reply cannot be empty")
        
        if not self.messages_log.exists():
            raise ValueError("No messages to reply to")
        
        # Get the original message
        original_msg = None
        with open(self.messages_log, "r", encoding="utf-8") as f:
            lines = f.readlines()
            if 1 <= msg_num <= len(lines):
                original_msg = lines[msg_num - 1].strip()
        
        if not original_msg:
            raise ValueError(f"Message {msg_num} not found")
        
        # Format reply with threading
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        reply_msg = f"[{timestamp}] {self.instance_id} -> coordination: [REPLY to msg #{msg_num}] {reply_text}"
        
        # Send the reply
        with open(self.messages_log, "a", encoding="utf-8") as f:
            f.write(reply_msg + "\n")
        
        # Generate reply ID
        reply_id = str(uuid.uuid4())[:8]
        self.log_action("REPLY_MESSAGE", f"Replied to message #{msg_num}")
        return reply_id
    
    def list_chatrooms(self) -> List[Dict]:
        """List all chatrooms and their status"""
        chatrooms = []
        
        if not self.chatroom_status.exists():
            return chatrooms
        
        with open(self.chatroom_status, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    parts = line.strip().split(":")
                    if len(parts) >= 5:
                        chatrooms.append({
                            "name": parts[0],
                            "status": parts[1],
                            "creator": parts[2],
                            "created": parts[3],
                            "modified": parts[4],
                            "reason": parts[5] if len(parts) > 5 else ""
                        })
        
        self.log_action("LIST_CHATROOMS", "Agent accessed chatroom list")
        return chatrooms
    
    def send_dm(self, to_instance: str, message: str) -> str:
        """Send a direct message to another instance"""
        if not to_instance.strip() or not message.strip():
            raise ValueError("Recipient and message cannot be empty")
        
        # Remove @ prefix if present
        if to_instance.startswith("@"):
            to_instance = to_instance[1:]
        
        # Generate DM ID
        dm_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Create DM entry for messages log
        dm_msg = f"[{timestamp}] DM: {self.instance_id} -> {to_instance}: {message}"
        
        # Write to messages log
        with open(self.messages_log, "a", encoding="utf-8") as f:
            f.write(dm_msg + "\n")
        
        # Create DM-specific directory if needed
        dm_dir = self.script_dir / "dms"
        dm_dir.mkdir(exist_ok=True)
        
        # Create conversation file (sorted by instance names)
        instances = sorted([self.instance_id, to_instance])
        conversation_file = dm_dir / f"dm_{instances[0]}_{instances[1]}.txt"
        
        # Append to conversation file
        with open(conversation_file, "a", encoding="utf-8") as f:
            f.write(f"[{timestamp}] {self.instance_id}: {message}\n")
        
        # Log the action
        self.log_action("SEND_DM", f"To: {to_instance} | ID: {dm_id}")
        return dm_id
    
    def check_dm(self) -> List[Dict]:
        """Check direct messages for this instance"""
        dm_dir = self.script_dir / "dms"
        if not dm_dir.exists():
            return []
        
        conversations = []
        
        # Find all DM files involving this instance
        for dm_file in dm_dir.glob("dm_*.txt"):
            filename = dm_file.stem
            if self.instance_id in filename:
                # Parse conversation
                messages = []
                if dm_file.exists():
                    with open(dm_file, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.strip():
                                messages.append(line.strip())
                
                # Extract other participant
                parts = filename.split("_")
                other_instance = parts[2] if parts[1] == self.instance_id else parts[1]
                
                conversations.append({
                    "participant": other_instance,
                    "file": str(dm_file),
                    "messages": messages,
                    "message_count": len(messages)
                })
        
        self.log_action("CHECK_DM", "Checking all DMs")
        return conversations
    
    def check_inbox(self) -> Dict:
        """Check unified inbox (DMs + mentions)"""
        inbox = {
            "direct_messages": self.check_dm(),
            "mentions": [],
            "unread_count": 0
        }
        
        # Get unread messages and filter for mentions
        unread_messages = self.get_unread_messages()
        for msg in unread_messages:
            if f"@{self.instance_id}" in msg["content"]:
                inbox["mentions"].append(msg)
        
        # Count total unread
        inbox["unread_count"] = len(unread_messages)
        
        self.log_action("CHECK_INBOX", f"Checked inbox: {len(inbox['direct_messages'])} DM conversations, {len(inbox['mentions'])} mentions")
        return inbox
    
    def reopen_chatroom(self, name: str, reason: str) -> bool:
        """Reopen a closed chatroom"""
        if not name.strip() or not reason.strip():
            raise ValueError("Chatroom name and reason cannot be empty")
        
        if not self.chatroom_status.exists():
            raise ValueError("No chatrooms exist")
        
        # Read and update chatroom status
        lines = []
        chatroom_found = False
        
        with open(self.chatroom_status, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith(f"{name}:closed:"):
                    # Reopen this chatroom
                    parts = line.strip().split(":")
                    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    new_line = f"{name}:open:{parts[2]}:{parts[3]}:{timestamp}:\n"
                    lines.append(new_line)
                    chatroom_found = True
                else:
                    lines.append(line)
        
        if not chatroom_found:
            raise ValueError(f"Chatroom '{name}' not found or already open")
        
        # Write back to file
        with open(self.chatroom_status, "w", encoding="utf-8") as f:
            f.writelines(lines)
        
        os.chmod(self.chatroom_status, 0o600)
        self.log_action("CHATROOM_REOPENED", f"Reopened chatroom '{name}' - Reason: {reason}")
        return True
    
    def check_chatroom(self, name: str) -> List[Dict]:
        """View messages in a specific chatroom"""
        if not name.strip():
            raise ValueError("Chatroom name cannot be empty")
        
        if not self.messages_log.exists():
            return []
        
        messages = []
        with open(self.messages_log, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                if f"-> #{name}:" in line or f"-> {name}:" in line:
                    messages.append({
                        "number": i,
                        "content": line.strip()
                    })
        
        self.log_action("CHECK_CHATROOM", f"Viewed: {name}")
        return messages
    
    def system_summary(self) -> Dict:
        """Generate comprehensive system summary"""
        summary = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "current_instance": self.instance_id,
            "statistics": self.system_status(),
            "instance_statuses": {},
            "recent_activity": []
        }
        
        # Get instance statuses
        status_pattern = self.data_dir / "status_*.txt"
        for status_file in self.data_dir.glob("status_*.txt"):
            instance_name = status_file.stem.replace("status_", "")
            if status_file.exists():
                with open(status_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    summary["instance_statuses"][instance_name] = content
        
        # Get recent activity from action log
        if self.action_log.exists():
            with open(self.action_log, "r", encoding="utf-8") as f:
                lines = f.readlines()
                summary["recent_activity"] = [line.strip() for line in lines[-20:]]
        
        self.log_action("SYSTEM_SUMMARY", "Generated comprehensive system summary")
        return summary
    
    def validate_command(self, command: str) -> Dict:
        """Validate command syntax and availability"""
        valid_commands = [
            "send", "reply", "search", "check-notifications", "check-unread", 
            "mark-read", "create-chatroom", "close-chatroom", "reopen-chatroom",
            "list-chatrooms", "check-chatroom", "system-status", "update-status",
            "send-dm", "check-dm", "check-inbox", "system-summary", "validate-command"
        ]
        
        result = {
            "command": command,
            "valid": command in valid_commands,
            "suggestion": None
        }
        
        if not result["valid"]:
            # Find closest match
            for valid_cmd in valid_commands:
                if command in valid_cmd or valid_cmd in command:
                    result["suggestion"] = valid_cmd
                    break
        
        self.log_action("VALIDATE_COMMAND", f"Validated command: {command}")
        return result


def main():
    """CLI interface for the coordination system"""
    import sys
    
    if len(sys.argv) < 2:
        print("🐍 PYTHON COORDINATION SYSTEM")
        print("=" * 40)
        print("Usage: python coordination.py <command> [args...]")
        print()
        print("📨 MESSAGING:")
        print("  send <target> <message>      - Send message to chatroom or @instance")
        print("  reply <msg_num> <text>       - Reply to specific message with threading")
        print("  search <query> [--recent N]  - Search messages by content")
        print()
        print("📬 NOTIFICATIONS:")
        print("  check-notifications          - Check for @mentions and alerts")
        print("  check-unread                - Show unread messages")
        print("  mark-read <number>          - Mark message as read")
        print()
        print("💬 CHATROOMS:")
        print("  create-chatroom <name> <desc> - Create new chatroom")
        print("  close-chatroom <name> <reason> - Close chatroom with reason")
        print("  reopen-chatroom <name> <reason> - Reopen closed chatroom")
        print("  list-chatrooms               - List all chatrooms and status")
        print("  check-chatroom <name>        - View messages in specific chatroom")
        print()
        print("📨 DIRECT MESSAGES:")
        print("  send-dm <instance> <message> - Send direct message to instance")
        print("  check-dm                     - Check all DM conversations")
        print("  check-inbox                  - View unified inbox (DMs + mentions)")
        print()
        print("🔧 SYSTEM:")
        print("  system-status               - Show comprehensive system status")
        print("  system-summary              - Show detailed system overview")
        print("  update-status <message>     - Update your instance status")
        print("  validate-command <command>  - Validate command syntax")
        return
    
    coord = CoordinationSystem()
    command = sys.argv[1]
    
    if command == "send":
        if len(sys.argv) < 4:
            print("Usage: send <target> <message>")
            return
        target = sys.argv[2]
        message = " ".join(sys.argv[3:])
        msg_id = coord.send_message(target, message)
        print(f"Message sent to {target}")
        print(f"Message ID: {msg_id}")
        
    elif command == "check-notifications":
        result = coord.check_notifications()
        if result["total"] > 0:
            print(f"🔔 NOTIFICATIONS: {result['total']} total")
            if result["mentions"] > 0:
                print(f"   📧 @mentions: {result['mentions']}")
            if result["alerts"] > 0:
                print(f"   ⚠️  System alerts: {result['alerts']}")
            print()
            print("Use 'check-unread' to see details")
        else:
            print("📭 No new notifications")
            
    elif command == "check-unread":
        messages = coord.get_unread_messages()
        print(f"=== Unread Messages for {coord.instance_id} ===")
        print()
        
        if not messages:
            print("All messages read! 📖")
        else:
            for msg in messages:
                print(f"[{msg['number']}] {msg['content']}")
            print()
            print(f"You have {len(messages)} unread messages.")
            
    elif command == "mark-read":
        if len(sys.argv) < 3:
            print("Usage: mark-read <number>")
            return
        try:
            msg_num = int(sys.argv[2])
            coord.mark_message_read(msg_num)
            print(f"Message {msg_num} marked as read")
        except ValueError:
            print("Message number must be an integer")
            
    elif command == "system-status":
        status = coord.system_status()
        print("🔧 COORDINATION SYSTEM STATUS")
        print("=" * 40)
        print(f"📨 Total messages: {status['total_messages']}")
        print(f"📭 Unread messages: {status['unread_messages']}")
        print(f"💬 Active chatrooms: {status['active_chatrooms']}")
        print()
        print("🕒 Recent Activity (last 10):")
        for activity in status['recent_activity'][-5:]:  # Show last 5 for brevity
            print(f"   {activity}")
            
    elif command == "update-status":
        if len(sys.argv) < 3:
            print("Usage: update-status <status_message>")
            return
        status_message = " ".join(sys.argv[2:])
        coord.update_status(status_message)
        print(f"Status updated: {status_message}")
        
    elif command == "create-chatroom":
        if len(sys.argv) < 4:
            print("Usage: create-chatroom <name> <description>")
            return
        name = sys.argv[2]
        description = " ".join(sys.argv[3:])
        try:
            coord.create_chatroom(name, description)
            print(f"Chatroom '{name}' created successfully")
        except ValueError as e:
            print(f"Error: {e}")
            
    elif command == "close-chatroom":
        if len(sys.argv) < 4:
            print("Usage: close-chatroom <name> <reason>")
            return
        name = sys.argv[2]
        reason = " ".join(sys.argv[3:])
        try:
            coord.close_chatroom(name, reason)
            print(f"Chatroom '{name}' closed")
        except ValueError as e:
            print(f"Error: {e}")
            
    elif command == "search":
        if len(sys.argv) < 3:
            print("Usage: search <query> [--recent N]")
            return
        query = sys.argv[2]
        recent = None
        if len(sys.argv) > 3 and sys.argv[3] == "--recent" and len(sys.argv) > 4:
            try:
                recent = int(sys.argv[4])
            except ValueError:
                print("Recent count must be a number")
                return
        
        results = coord.search_messages(query, recent)
        print(f"Search results for '{query}':")
        print("=" * 40)
        if not results:
            print("No messages found")
        else:
            for result in results:
                print(f"[{result['number']}] {result['content']}")
                
    elif command == "reply":
        if len(sys.argv) < 4:
            print("Usage: reply <message_number> <reply_text>")
            return
        try:
            msg_num = int(sys.argv[2])
            reply_text = " ".join(sys.argv[3:])
            reply_id = coord.reply_to_message(msg_num, reply_text)
            print(f"Reply sent to message {msg_num}")
            print(f"Reply ID: {reply_id}")
        except ValueError as e:
            print(f"Error: {e}")
            
    elif command == "list-chatrooms":
        chatrooms = coord.list_chatrooms()
        print("📋 CHATROOMS")
        print("=" * 40)
        if not chatrooms:
            print("No chatrooms found")
        else:
            for room in chatrooms:
                status_icon = "🟢" if room["status"] == "open" else "🔴"
                print(f"{status_icon} {room['name']} ({room['status']}) - created by {room['creator']}")
                if room["reason"]:
                    print(f"    Reason: {room['reason']}")
                    
    elif command == "reopen-chatroom":
        if len(sys.argv) < 4:
            print("Usage: reopen-chatroom <name> <reason>")
            return
        name = sys.argv[2]
        reason = " ".join(sys.argv[3:])
        try:
            coord.reopen_chatroom(name, reason)
            print(f"Chatroom '{name}' reopened")
        except ValueError as e:
            print(f"Error: {e}")
            
    elif command == "check-chatroom":
        if len(sys.argv) < 3:
            print("Usage: check-chatroom <name>")
            return
        name = sys.argv[2]
        messages = coord.check_chatroom(name)
        print(f"=== Messages in #{name} ===")
        if not messages:
            print("No messages found in this chatroom")
        else:
            for msg in messages:
                print(f"[{msg['number']}] {msg['content']}")
                
    elif command == "send-dm":
        if len(sys.argv) < 4:
            print("Usage: send-dm <instance> <message>")
            return
        to_instance = sys.argv[2]
        message = " ".join(sys.argv[3:])
        try:
            dm_id = coord.send_dm(to_instance, message)
            print(f"DM sent to {to_instance}")
            print(f"DM ID: {dm_id}")
        except ValueError as e:
            print(f"Error: {e}")
            
    elif command == "check-dm":
        conversations = coord.check_dm()
        print("📧 DIRECT MESSAGE CONVERSATIONS")
        print("=" * 40)
        if not conversations:
            print("No DM conversations found")
        else:
            for conv in conversations:
                print(f"💬 Conversation with {conv['participant']} ({conv['message_count']} messages)")
                for msg in conv['messages'][-3:]:  # Show last 3 messages
                    print(f"   {msg}")
                if conv['message_count'] > 3:
                    print(f"   ... and {conv['message_count'] - 3} more messages")
                print()
                
    elif command == "check-inbox":
        inbox = coord.check_inbox()
        print("📮 UNIFIED INBOX")
        print("=" * 40)
        print(f"📭 Unread messages: {inbox['unread_count']}")
        print(f"💬 DM conversations: {len(inbox['direct_messages'])}")
        print(f"📧 @mentions: {len(inbox['mentions'])}")
        print()
        
        if inbox['mentions']:
            print("Recent @mentions:")
            for mention in inbox['mentions'][-5:]:
                print(f"  [{mention['number']}] {mention['content']}")
        
    elif command == "system-summary":
        summary = coord.system_summary()
        print("🔍 SYSTEM SUMMARY")
        print("=" * 50)
        print(f"Timestamp: {summary['timestamp']}")
        print(f"Current Instance: {summary['current_instance']}")
        print()
        
        print("📊 STATISTICS:")
        stats = summary['statistics']
        print(f"  Total messages: {stats['total_messages']}")
        print(f"  Unread messages: {stats['unread_messages']}")
        print(f"  Active chatrooms: {stats['active_chatrooms']}")
        print()
        
        print("👥 INSTANCE STATUSES:")
        if summary['instance_statuses']:
            for instance, status in summary['instance_statuses'].items():
                print(f"  {instance}: {status}")
        else:
            print("  No instance statuses available")
        print()
        
        print("🕒 RECENT ACTIVITY (last 10):")
        for activity in summary['recent_activity'][-10:]:
            print(f"  {activity}")
            
    elif command == "validate-command":
        if len(sys.argv) < 3:
            print("Usage: validate-command <command>")
            return
        cmd_to_validate = sys.argv[2]
        result = coord.validate_command(cmd_to_validate)
        
        if result['valid']:
            print(f"✅ Command '{cmd_to_validate}' is valid")
        else:
            print(f"❌ Command '{cmd_to_validate}' is not valid")
            if result['suggestion']:
                print(f"💡 Did you mean: {result['suggestion']}?")
        
    else:
        print(f"Unknown command: {command}")
        print("Use 'python3 coordination.py' with no args for help")


if __name__ == "__main__":
    main()