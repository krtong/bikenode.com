#!/usr/bin/env python3
import os
import time
import json
from datetime import datetime

print("📡 Monitoring for Discord messages...")
print("File: pending_discord_message.json")
print("-" * 50)

last_mtime = 0

while True:
    try:
        if os.path.exists('pending_discord_message.json'):
            current_mtime = os.path.getmtime('pending_discord_message.json')
            
            if current_mtime > last_mtime:
                with open('pending_discord_message.json', 'r') as f:
                    data = json.load(f)
                
                print(f"\n🆕 NEW MESSAGE at {datetime.now().strftime('%H:%M:%S')}")
                print(f"From: {data.get('username')}")
                print(f"Message: {data.get('message')}")
                print(f"ID: {data.get('id')}")
                print("-" * 50)
                
                last_mtime = current_mtime
        
        time.sleep(1)
        
    except KeyboardInterrupt:
        print("\nMonitor stopped")
        break
    except Exception as e:
        print(f"Error: {e}")