import aiohttp
import logging
import json
import sqlite3
from pathlib import Path
import asyncio

logger = logging.getLogger('BikeRoleBot')

class BikeNodeAPI:
    """Client for interacting with the BikeNode API"""
    
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip('/')  # Remove trailing slash if present
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.session = None
        self.db_path = Path(__file__).parent.parent / 'data' / 'bikes.db'
        self.timeout = aiohttp.ClientTimeout(total=10)  # 10 second timeout
        logger.info(f"BikeNode API client initialized with base URL: {self.base_url}")
    
    async def _get_session(self):
        """Get or create an aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(timeout=self.timeout)
        return self.session
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def request(self, method, endpoint, data=None, params=None):
        """Generic request method for API calls"""
        session = await self._get_session()
        url = f"{self.base_url}{endpoint}"
        
        try:
            async with session.request(
                method, 
                url, 
                json=data, 
                params=params,
                headers=self.headers
            ) as resp:
                if resp.status in (200, 201, 204):
                    if resp.content_type == 'application/json':
                        return await resp.json()
                    return await resp.text()
                else:
                    error_text = await resp.text()
                    logger.error(f"API error {resp.status} on {method} {url}: {error_text}")
                    return {"error": True, "status": resp.status, "message": error_text}
        except aiohttp.ClientError as e:
            logger.error(f"Request error on {method} {url}: {e}")
            return {"error": True, "message": str(e)}
        except asyncio.TimeoutError:
            logger.error(f"Request timeout on {method} {url}")
            return {"error": True, "message": "Request timed out"}
    
    async def request_link(self, discord_id):
        """Request a linking code for a Discord user"""
        return await self.request("POST", "/link/request", {"discord_id": discord_id})
    
    async def get_user_id(self, discord_id):
        """Get BikeNode user ID for a Discord user if linked"""
        result = await self.request("GET", f"/users/discord/{discord_id}")
        if result and not result.get("error"):
            return result.get("user_id")
        return None
    
    async def get_user_bikes(self, user_id):
        """Get user's motorcycles"""
        result = await self.request("GET", f"/users/{user_id}/bikes")
        if result and not result.get("error"):
            return result
        return []
    
    async def get_bike_by_id(self, bike_id):
        """Get bike details from local database by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, year, make, model, package, category, engine
                FROM motorcycles WHERE id = ?
            """, (bike_id,))
            
            result = cursor.fetchone()
            if result:
                return dict(result)
            return None
        except Exception as e:
            logger.exception(f"Database error getting bike {bike_id}")
            return None
        finally:
            if conn:
                conn.close()

    async def add_bike(self, user_id, bike_id=None, bike_data=None):
        """Add a motorcycle to user's profile"""
        if not bike_id and not bike_data:
            return {"error": True, "message": "Must provide either bike_id or bike_data"}
            
        if bike_id:  # Get bike details from database
            bike_details = await self.get_bike_by_id(bike_id)
            if not bike_details:
                return {"error": True, "message": f"Bike ID {bike_id} not found in database"}
            
            bike_data = {
                "year": bike_details["year"],
                "make": bike_details["make"],
                "model": bike_details["model"],
                "package": bike_details["package"],
                "category": bike_details["category"],
                "engine": bike_details["engine"],
                "db_id": bike_id
            }
        
        return await self.request("POST", f"/users/{user_id}/bikes", bike_data)
    
    async def remove_bike(self, user_id, bike_id, reason=None, date=None):
        """Remove a motorcycle from user's profile"""
        request_data = {"reason": reason, "date": date}
        
        # If the bike_id is from the database (integer), get API bike ID
        if isinstance(bike_id, int):
            request_data["db_id"] = bike_id
        
        return await self.request("DELETE", f"/users/{user_id}/bikes/{bike_id}", request_data)
    
    async def lookup_bike(self, year, make, model, package=None):
        """Look up motorcycle details from local database and API"""
        # First check local database
        bike_data = await self._lookup_bike_in_db(year, make, model, package)
        if (bike_data):
            return bike_data
            
        # If not found in database, try API
        endpoint = f"/bikes/{year}/{make}/{model}"
        if package:
            endpoint += f"/{package}"
        
        return await self.request("GET", endpoint)

    async def _lookup_bike_in_db(self, year, make, model, package=None):
        """Look up a bike in the local database"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT id, year, make, model, package, category, engine
                FROM motorcycles 
                WHERE year = ? AND make = ? AND model = ?
            """
            params = [year, make, model]
            
            if package:
                query += " AND package = ?"
                params.append(package)
            
            cursor.execute(query, params)
            result = cursor.fetchone()
            
            if result:
                bike_data = dict(result)
                bike_data['db_id'] = bike_data.pop('id')  # Rename id to db_id
                return bike_data
            return None
                
        except Exception as e:
            logger.error(f"Database error looking up bike: {e}")
            return None
        finally:
            if conn:
                conn.close()

    async def get_allowed_servers(self, user_id):
        """Get servers the user has allowed profile sharing with"""
        result = await self.request("GET", f"/users/{user_id}/allowed_servers")
        if result and not result.get("error"):
            return result
        return []

    async def get_user_roles(self, discord_id):
        """Get the roles that should be assigned to a user based on their bikes"""
        result = await self.request("GET", f"/users/discord/{discord_id}/roles")
        if result and not result.get("error"):
            return result.get("roles", [])
        return []

    async def check_premium(self, user_id):
        """Check if a user has premium status"""
        result = await self.request("GET", f"/users/{user_id}/premium")
        if result and not result.get("error"):
            return result.get("premium", False)
        return False

    async def get_user_profile(self, user_id):
        """Get a user's complete profile information"""
        return await self.request("GET", f"/users/{user_id}/profile")
