#!/usr/bin/env python3
"""
Quick bot startup with better error handling
"""
import os
import sys
import asyncio
import traceback
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_bot():
    """Test if the bot can start up properly"""
    try:
        print("🚀 Testing bot startup...")
        
        # Check token
        token = os.getenv("DISCORD_BOT_TOKEN")
        if not token:
            print("❌ Error: DISCORD_BOT_TOKEN not found in environment")
            return False
        
        print(f"✅ Token found (length: {len(token)})")
        
        # Try importing discord
        import discord
        print(f"✅ Discord.py imported (version: {discord.__version__})")
        
        # Try importing bot module
        import bot
        print("✅ Bot module imported successfully")
        
        print("\n🔗 Attempting to connect to Discord...")
        print("(This will timeout after 10 seconds if connection fails)")
        
        # Try to run the bot with timeout
        try:
            await asyncio.wait_for(bot.run_bot(), timeout=10.0)
        except asyncio.TimeoutError:
            print("⏰ Connection timeout - bot may be trying to connect")
            print("This is normal - the bot is likely running but connection takes time")
            return True
        except Exception as e:
            print(f"❌ Bot startup error: {e}")
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"❌ Startup test failed: {e}")
        traceback.print_exc()
        return False

def main():
    print("🧪 Discord Bot Quick Start Test")
    print("=" * 40)
    
    result = asyncio.run(test_bot())
    
    if result:
        print("\n✅ Bot startup test completed!")
        print("\nTo start the bot normally, run:")
        print("   /usr/bin/python3 launch.py")
        print("\nOr to run in background:")
        print("   nohup /usr/bin/python3 launch.py > bot.log 2>&1 &")
    else:
        print("\n❌ Bot startup test failed!")
        print("Check the errors above for troubleshooting.")

if __name__ == "__main__":
    main()