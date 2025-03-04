import aiohttp
import logging
import json
import sqlite3
from pathlib import Path

logger = logging.getLogger('BikeRoleBot')

class BikeNodeAPI:
    """Client for interacting with the BikeNode API"""
    
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        self.session = None
        self.db_path = Path(__file__).parent.parent / 'data' / 'bikes.db'
    
    async def _get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def request_link(self, discord_id):
        """Request a linking code for a Discord user"""
        session = await self._get_session()
        try:
            async with session.post(
                f"{self.base_url}/link/request",
                json={"discord_id": discord_id},
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    logger.error(f"API error {resp.status}: {await resp.text()}")
                    return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    async def get_user_id(self, discord_id):
        """Get BikeNode user ID for a Discord user if linked"""
        session = await self._get_session()
        try:
            async with session.get(
                f"{self.base_url}/users/discord/{discord_id}",
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get('user_id')
                elif resp.status == 404:
                    return None
                else:
                    logger.error(f"API error {resp.status}: {await resp.text()}")
                    return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    async def get_user_bikes(self, user_id):
        """Get user's motorcycles"""
        session = await self._get_session()
        try:
            async with session.get(
                f"{self.base_url}/users/{user_id}/bikes",
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    logger.error(f"API error {resp.status}: {await resp.text()}")
                    return []
        except Exception as e:
            logger.error(f"Request error: {e}")
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
        """Add a motorcycle to user's profile using either database ID or full details"""
        if not bike_id and not bike_data:
            return {"error": True, "message": "Must provide either bike_id or bike_data"}
            
        session = await self._get_session()
        
        try:
            # If bike_id provided, get details from database
            if bike_id:
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
                    "db_id": bike_id  # Include database ID in API request
                }
            
            # Add purchase_date if provided in bike_data
            if bike_data and "purchase_date" in bike_data:
                bike_data["purchase_date"] = bike_data["purchase_date"]
            
            async with session.post(
                f"{self.base_url}/users/{user_id}/bikes",
                json=bike_data,
                headers=self.headers
            ) as resp:
                if resp.status in (200, 201):
                    response_data = await resp.json()
                    # Include database ID in response if it was used
                    if bike_id:
                        response_data["db_id"] = bike_id
                    return response_data
                else:
                    error_text = await resp.text()
                    logger.error(f"API error {resp.status}: {error_text}")
                    return {"error": True, "message": error_text}
                    
        except Exception as e:
            logger.error(f"Request error: {e}")
            return {"error": True, "message": str(e)}
    
    async def remove_bike(self, user_id, bike_id, reason=None, date=None):
        """Remove a motorcycle from user's profile"""
        session = await self._get_session()
        
        try:
            # Prepare request data
            request_data = {
                "reason": reason,
                "date": date
            }
            
            # If the bike_id is from the database (integer), get API bike ID
            if isinstance(bike_id, int):
                bike_details = await self.get_bike_by_id(bike_id)
                if bike_details:
                    request_data["db_id"] = bike_id
            
            async with session.delete(
                f"{self.base_url}/users/{user_id}/bikes/{bike_id}",
                json=request_data,
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    return {"success": True}
                else:
                    error_text = await resp.text()
                    logger.error(f"API error {resp.status}: {error_text}")
                    return {"error": True, "message": error_text}
                    
        except Exception as e:
            logger.error(f"Request error: {e}")
            return {"error": True, "message": str(e)}
    
    async def lookup_bike(self, year, make, model, package=None):
        """Look up motorcycle details from local database and API"""
        try:
            # First check local database
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
                
            # If not found in database, try API
            session = await self._get_session()
            url = f"{self.base_url}/bikes/{year}/{make}/{model}"
            if package:
                url += f"/{package}"
            
            async with session.get(url, headers=self.headers) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    logger.error(f"API error {resp.status}: {await resp.text()}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error looking up bike: {e}")
            return None
        finally:
            if conn:
                conn.close()

    async def get_allowed_servers(self, user_id):
        """Get servers the user has allowed profile sharing with"""
        session = await self._get_session()
        try:
            async with session.get(
                f"{self.base_url}/users/{user_id}/allowed_servers",
                headers=self.headers
            ) as resp:
                if resp.status == 200:
                    return await resp.json()
                else:
                    logger.error(f"API error {resp.status}: {await resp.text()}")
                    return []
        except Exception as e:
            logger.error(f"Request error: {e}")
            return []
