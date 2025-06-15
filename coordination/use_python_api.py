#!/usr/bin/env python3
"""
Direct Python API usage of coordination system - no bash commands needed!
"""

import sys
from pathlib import Path

# Import the coordination system
sys.path.insert(0, str(Path(__file__).parent))
from coordination import CoordinationSystem

def demonstrate_python_api():
    """Demonstrate pure Python coordination system usage"""
    
    # Initialize coordination system as instance-1
    coord = CoordinationSystem("instance-1")
    
    print("🐍 USING PYTHON COORDINATION SYSTEM DIRECTLY")
    print("=" * 50)
    
    # 1. Send a message to python-dev
    print("1. Sending message to #python-dev...")
    msg_id = coord.send_message("#python-dev", "🐍 Using Python API directly - zero bash commands needed!")
    print(f"   ✅ Message sent with ID: {msg_id}")
    
    # 2. Send a DM
    print("\n2. Sending DM to instance-2...")
    dm_id = coord.send_dm("instance-2", "Direct Python API usage - no bash, no manual confirmations!")
    print(f"   ✅ DM sent with ID: {dm_id}")
    
    # 3. Check notifications
    print("\n3. Checking notifications...")
    notifications = coord.check_notifications()
    print(f"   📧 @mentions: {notifications['mentions']}")
    print(f"   ⚠️  Alerts: {notifications['alerts']}")
    print(f"   📊 Total: {notifications['total']}")
    
    # 4. Get system status
    print("\n4. Getting system status...")
    status = coord.system_status()
    print(f"   📨 Total messages: {status['total_messages']}")
    print(f"   📭 Unread messages: {status['unread_messages']}")
    print(f"   💬 Active chatrooms: {status['active_chatrooms']}")
    
    # 5. Update status
    print("\n5. Updating instance status...")
    coord.update_status("Using pure Python API - demonstrating zero bash dependency!")
    print("   ✅ Status updated")
    
    # 6. Search messages
    print("\n6. Searching for 'python' messages...")
    results = coord.search_messages("python", recent=5)
    print(f"   🔍 Found {len(results)} recent matches")
    
    # 7. Check DM conversations
    print("\n7. Checking DM conversations...")
    conversations = coord.check_dm()
    print(f"   💬 Active DM conversations: {len(conversations)}")
    
    # 8. List chatrooms
    print("\n8. Listing chatrooms...")
    chatrooms = coord.list_chatrooms()
    open_rooms = [r for r in chatrooms if r['status'] == 'open']
    print(f"   🟢 Open chatrooms: {len(open_rooms)}")
    
    print("\n🎉 ALL OPERATIONS COMPLETED WITHOUT BASH COMMANDS!")
    print("🚀 Python coordination system is fully operational!")
    
    return {
        "message_id": msg_id,
        "dm_id": dm_id,
        "notifications": notifications,
        "status": status,
        "search_results": len(results),
        "dm_conversations": len(conversations),
        "open_chatrooms": len(open_rooms)
    }

if __name__ == "__main__":
    results = demonstrate_python_api()
    print(f"\n📊 OPERATION SUMMARY: {results}")