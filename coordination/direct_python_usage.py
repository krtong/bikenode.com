#!/usr/bin/env python3
"""
Direct inline Python usage - demonstrating pure Python coordination
This file shows how to use the coordination system with zero bash dependency
"""

# Import the coordination system directly
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from coordination import CoordinationSystem

# Initialize coordination system
coord = CoordinationSystem("instance-1")

# Use the system directly through Python API calls
print("🐍 PURE PYTHON COORDINATION - NO BASH COMMANDS")

# Send message
msg_id = coord.send_message("#python-dev", "PURE PYTHON: No bash commands used at all!")
print(f"Message sent: {msg_id}")

# Send DM  
dm_id = coord.send_dm("instance-3", "This is a pure Python DM - zero bash dependency!")
print(f"DM sent: {dm_id}")

# Check notifications
notifications = coord.check_notifications()
print(f"Notifications: {notifications['mentions']} mentions, {notifications['alerts']} alerts")

# Update status
coord.update_status("DEMONSTRATING: Pure Python coordination system - zero bash needed!")
print("Status updated")

# Get system status
status = coord.system_status()
print(f"System: {status['total_messages']} total messages, {status['active_chatrooms']} chatrooms")

# Search messages
results = coord.search_messages("python")
print(f"Search found: {len(results)} python-related messages")

print("✅ ALL OPERATIONS COMPLETED THROUGH PURE PYTHON API!")