#!/usr/bin/env python3

import aiohttp
import asyncio
import json

async def test_bikenode_api():
    """Test BikeNode API integration"""
    base_url = "http://localhost:8080/api"
    
    print("🚴‍♂️ Testing BikeNode API Integration\n")
    
    async with aiohttp.ClientSession() as session:
        # Test health endpoint
        print("1. Testing health endpoint...")
        try:
            async with session.get(f"{base_url}/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"   ✅ Health check: {data}")
                else:
                    print(f"   ❌ Health check failed: {response.status}")
        except Exception as e:
            print(f"   ❌ Health check error: {e}")
        
        # Test Discord user endpoint  
        print("\n2. Testing Discord user endpoint...")
        test_discord_id = "123456789"
        try:
            async with session.get(f"{base_url}/discord/user/{test_discord_id}") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"   ✅ Discord user: {data}")
                else:
                    print(f"   ❌ Discord user failed: {response.status}")
        except Exception as e:
            print(f"   ❌ Discord user error: {e}")
            
        # Test Discord user bikes endpoint
        print("\n3. Testing Discord user bikes endpoint...")
        try:
            async with session.get(f"{base_url}/discord/user/{test_discord_id}/bikes") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"   ✅ User bikes: {data}")
                else:
                    print(f"   ❌ User bikes failed: {response.status}")
        except Exception as e:
            print(f"   ❌ User bikes error: {e}")
            
        # Test bicycle search endpoint
        print("\n4. Testing bicycle search endpoint...")
        try:
            async with session.get(f"{base_url}/bicycles/search?q=trek") as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"   ✅ Bicycle search: {data}")
                else:
                    print(f"   ❌ Bicycle search failed: {response.status}")
        except Exception as e:
            print(f"   ❌ Bicycle search error: {e}")
    
    print("\n🎉 Integration test completed!")

if __name__ == "__main__":
    asyncio.run(test_bikenode_api())