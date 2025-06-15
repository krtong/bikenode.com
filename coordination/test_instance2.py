#!/usr/bin/env python3
"""
Instance-2 testing the Python coordination system directly via API
"""

import sys
import os
from pathlib import Path

# Add coordination directory to path
coord_dir = Path(__file__).parent
sys.path.insert(0, str(coord_dir))

from coordination import CoordinationSystem

def test_as_instance2():
    """Test Python system as instance-2"""
    
    # Initialize as instance-2
    coord = CoordinationSystem("instance-2")
    
    print("🐍 PYTHON COORDINATION SYSTEM - INSTANCE-2 TESTING")
    print("=" * 60)
    
    # Test 1: Send message to python-dev
    print("\n1. Sending message to #python-dev...")
    try:
        msg_id = coord.send_message("#python-dev", "Instance-2 testing Python API directly (no bash)")
        print(f"   ✅ Message sent with ID: {msg_id}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 2: Check notifications
    print("\n2. Checking notifications...")
    try:
        notifications = coord.check_notifications()
        print(f"   📧 Mentions: {notifications['mentions']}")
        print(f"   ⚠️  Alerts: {notifications['alerts']}")
        print(f"   🔔 Total: {notifications['total']}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Get unread messages count
    print("\n3. Checking unread messages...")
    try:
        unread = coord.get_unread_messages()
        print(f"   📭 Unread messages: {len(unread)}")
        if len(unread) > 0:
            print(f"   📮 Latest: {unread[-1]['content'][:50]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 4: System status
    print("\n4. Getting system status...")
    try:
        status = coord.system_status()
        print(f"   📊 Total messages: {status['total_messages']}")
        print(f"   📭 Unread: {status['unread_messages']}")
        print(f"   💬 Active chatrooms: {status['active_chatrooms']}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 5: Send direct message
    print("\n5. Sending DM to instance-1...")
    try:
        msg_id = coord.send_message("@instance-1", "Python API test DM from instance-2")
        print(f"   ✅ DM sent with ID: {msg_id}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 6: Update status
    print("\n6. Updating status...")
    try:
        coord.update_status("Testing Python API directly - no bash commands")
        print("   ✅ Status updated successfully")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 7: Search messages
    print("\n7. Searching for 'python' messages...")
    try:
        results = coord.search_messages("python", recent=10)
        print(f"   🔍 Found {len(results)} recent matches")
        if results:
            print(f"   📝 Latest match: {results[-1]['content'][:50]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 8: List chatrooms
    print("\n8. Listing chatrooms...")
    try:
        chatrooms = coord.list_chatrooms()
        open_rooms = [r for r in chatrooms if r['status'] == 'open']
        closed_rooms = [r for r in chatrooms if r['status'] == 'closed']
        print(f"   🟢 Open chatrooms: {len(open_rooms)}")
        print(f"   🔴 Closed chatrooms: {len(closed_rooms)}")
        if open_rooms:
            print(f"   💬 Active: {', '.join([r['name'] for r in open_rooms[:3]])}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n🎯 PYTHON API TEST COMPLETE!")
    print("All features tested directly through Python coordination.py API")

if __name__ == "__main__":
    test_as_instance2()