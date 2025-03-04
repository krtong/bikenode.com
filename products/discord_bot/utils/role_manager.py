import discord
import logging
from pathlib import Path
import json
import asyncio
from .helpers import load_server_settings, create_bike_role_name

logger = logging.getLogger('BikeRoleBot')

class RoleManager:
    """Manages bike-related roles in Discord servers"""
    
    def __init__(self, bot, api):
        self.bot = bot
        self.api = api
        self.data_dir = Path(__file__).parent.parent / 'data'
        self.data_dir.mkdir(exist_ok=True)
        self.settings_file = self.data_dir / 'settings.json'
        self.settings = self._load_settings()
        
    def _load_settings(self):
        """Load server settings from file"""
        if self.settings_file.exists():
            try:
                with open(self.settings_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading settings: {e}")
        return {}
        
    async def get_user_roles(self, member, guild):
        """Get roles that should be assigned to a user based on their bikes"""
        user_id = await self.api.get_user_id(str(member.id))
        if not user_id:
            return []
            
        # Get user's bikes
        bikes = await self.api.get_user_bikes(user_id)
        if not bikes:
            return []
            
        # Get server settings
        server_id = str(guild.id)
        server_settings = self.settings.get(server_id, {})
        role_mode = server_settings.get('role_mode', 'brand')
        
        if role_mode == 'none':
            return []
            
        # Generate roles based on role_mode
        roles = []
        for bike in bikes:
            if role_mode == 'brand' and 'make' in bike:
                role_name = f"Bike-{bike['make']}"
                role = discord.utils.get(guild.roles, name=role_name)
                if not role:
                    # Create role if it doesn't exist
                    try:
                        role_color = discord.Color(server_settings.get('role_color', discord.Color.blue().value))
                        role = await guild.create_role(name=role_name, color=role_color)
                        logger.info(f"Created role {role_name} in {guild.name}")
                    except Exception as e:
                        logger.error(f"Error creating role {role_name}: {e}")
                        continue
                roles.append(role)
            elif role_mode == 'category' and 'category' in bike:
                role_name = f"Bike-{bike['category']}"
                role = discord.utils.get(guild.roles, name=role_name)
                if not role:
                    try:
                        role_color = discord.Color(server_settings.get('role_color', discord.Color.blue().value))
                        role = await guild.create_role(name=role_name, color=role_color)
                    except Exception as e:
                        logger.error(f"Error creating role {role_name}: {e}")
                        continue
                roles.append(role)
                
        return roles
        
    async def update_user_roles(self, member):
        """Update roles for a specific user across all servers"""
        for guild in self.bot.guilds:
            if member in guild.members:
                await self.update_member_roles_in_guild(member, guild)
                
    async def update_member_roles_in_guild(self, member, guild):
        """Update roles for a member in a specific guild"""
        try:
            # Get roles for this user
            roles_to_add = await self.get_user_roles(member, guild)
            if not roles_to_add:
                return
                
            # Get bike roles the member currently has
            current_bike_roles = [r for r in member.roles if r.name.startswith("Bike-")]
            
            # Add missing roles
            roles_to_add_set = set(roles_to_add)
            current_roles_set = set(current_bike_roles)
            
            # Add new roles
            for role in roles_to_add_set - current_roles_set:
                try:
                    await member.add_roles(role, reason="BikeNode profile update")
                    logger.info(f"Added role {role.name} to {member.display_name} in {guild.name}")
                except Exception as e:
                    logger.error(f"Error adding role {role.name} to {member.display_name}: {e}")
            
            # Remove outdated roles
            for role in current_roles_set - roles_to_add_set:
                try:
                    await member.remove_roles(role, reason="BikeNode profile update")
                    logger.info(f"Removed role {role.name} from {member.display_name} in {guild.name}")
                except Exception as e:
                    logger.error(f"Error removing role {role.name} from {member.display_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error updating roles for {member.display_name} in {guild.name}: {e}")
            
    async def update_roles_for_guild(self, guild):
        """Update roles for all members in a guild"""
        logger.info(f"Updating roles for all members in {guild.name}")
        
        for member in guild.members:
            if not member.bot:
                await self.update_member_roles_in_guild(member, guild)
                
        logger.info(f"Completed role update for {guild.name}")

    async def cleanup_unused_roles(self, guild):
        """Delete any 'Bike-' roles that have no members"""
        try:
            deleted_count = 0
            for role in guild.roles:
                if role.name.startswith('Bike-') and len(role.members) == 0:
                    try:
                        await role.delete(reason="BikeRole cleanup - unused role")
                        deleted_count += 1
                        # Add small delay to avoid rate limits
                        await asyncio.sleep(0.5)
                    except discord.Forbidden:
                        logger.error(f"No permission to delete role {role.name} in {guild.name}")
                    except discord.HTTPException as e:
                        logger.error(f"Error deleting role {role.name}: {e}")

            logger.info(f"Cleaned up {deleted_count} unused bike roles in {guild.name}")
            return deleted_count
        except Exception as e:
            logger.error(f"Error during role cleanup in {guild.name}: {e}")
            return 0
