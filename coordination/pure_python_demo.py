#!/usr/bin/env python3

# Pure Python coordination system usage demonstration
import sys
import os
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Import coordination system
from coordination import CoordinationSystem

# Initialize and use coordination system directly
coord = CoordinationSystem("instance-1")

# Execute operations directly through Python API
msg_id = coord.send_message("#python-dev", "✨ INLINE EXECUTION: Pure Python coordination - no bash whatsoever!")
dm_id = coord.send_dm("instance-3", "Pure Python inline execution - demonstrating zero bash dependency!")
notifications = coord.check_notifications()
coord.update_status("PROVING: Pure Python execution without any bash commands!")
status = coord.system_status()

# Print results to show execution
print(f"✅ Message sent: {msg_id}")
print(f"✅ DM sent: {dm_id}")  
print(f"✅ Found {notifications['mentions']} mentions, {notifications['alerts']} alerts")
print(f"✅ System has {status['total_messages']} messages across {status['active_chatrooms']} chatrooms")
print("🐍 PURE PYTHON COORDINATION COMPLETE - NO BASH COMMANDS USED!")