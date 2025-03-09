import discord
import logging
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional

logger = logging.getLogger('BikeRoleBot')

class RoleManager:
    """Manages motorcycle-related roles for Discord members"""
    
    def __init__(self, bot, api_client):
        """Initialize the role manager
        
        Args:
            bot: Discord bot instance
            api_client: BikeNode API client
        """
        self.bot = bot
        self.api = api_client
        self.config = self._load_role_config()
        self.role_prefix = self.config.get('prefix', 'Bike-')
    
    def _load_role_config(self) -> Dict[str, Any]:
        """Load role configuration from config file
        
        Returns:
            dict: Role configuration dictionary
        """
        config_path = Path(__file__).parent.parent / 'config' / 'config.yaml'
        
        try:
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                return config.get('roles', {})
        except Exception as e:
            logger.error(f"Error loading role config: {e}")
            return {'prefix': 'Bike-'}
    
    async def update_user_roles(self, member: discord.Member) -> bool:
        """Update a member's roles based on their motorcycle data
        
        Args:
            member: Discord member to update roles for
            
        Returns:
            bool: True if roles were successfully updated
        """
        try:
            # Get user's role data from API
            discord_id = str(member.id)
            roles_data = await self.api.get_user_roles(discord_id)
            
            if not roles_data:
                logger.info(f"No role data found for user {discord_id}")
                return False
            
            server_id = str(member.guild.id)
            server_settings = await self._get_server_settings(member.guild)
            role_mode = server_settings.get('role_mode', 'brand')
            
            # Get roles to add and remove
            to_add, to_remove = await self._get_role_changes(member, roles_data, role_mode)
            
            # Update member roles
            if to_remove:
                await member.remove_roles(*to_remove, reason="BikeNode automatic role update")
                
            if to_add:
                await member.add_roles(*to_add, reason="BikeNode automatic role update")
            
            # Update premium role if applicable
            await self.check_and_update_premium_role(member)
            
            logger.info(f"Updated roles for {member.name} in {member.guild.name}")
            return True
        except Exception as e:
            logger.error(f"Error updating roles for {member.name}: {e}")
            return False
    
    async def _get_role_changes(
        self, member: discord.Member, roles_data: List[str], role_mode: str
    ) -> tuple:
        """Determine which roles to add and remove
        
        Args:
            member: Discord member
            roles_data: List of role names from API
            role_mode: 'brand' or 'category' mode
            
        Returns:
            tuple: (roles_to_add, roles_to_remove)
        """
        guild = member.guild
        to_add = []
        
        # Filter roles based on role mode
        if role_mode == 'brand':
            filtered_roles = [r for r in roles_data if 'brand:' in r.lower()]
        elif role_mode == 'category':
            filtered_roles = [r for r in roles_data if 'category:' in r.lower()]
        else:
            filtered_roles = []
        
        # Extract actual role names
        role_names = []
        for role_data in filtered_roles:
            if ':' in role_data:
                role_type, role_name = role_data.split(':', 1)
                role_names.append(self.role_prefix + role_name.strip())
        
        # Find roles to add (create if missing)
        for role_name in role_names:
            role = discord.utils.get(guild.roles, name=role_name)
            if not role:
                try:
                    default_color = int(self.config.get('default_color', '0x3498db').replace('0x', ''), 16)
                    role = await guild.create_role(
                        name=role_name, 
                        color=discord.Color(default_color),
                        mentionable=True,
                        reason="BikeNode automatic role creation"
                    )
                    logger.info(f"Created role {role_name} in {guild.name}")
                except Exception as e:
                    logger.error(f"Error creating role {role_name}: {e}")
                    continue
            
            if role not in member.roles:
                to_add.append(role)
        
        # Find roles to remove (any bike role not in our list)
        to_remove = []
        for role in member.roles:
            if role.name.startswith(self.role_prefix) and role.name not in role_names:
                to_remove.append(role)
        
        return to_add, to_remove
    
    async def check_and_update_premium_role(self, member: discord.Member) -> bool:
        """Add or remove premium role based on user's subscription status
        
        Args:
            member: Discord member
            
        Returns:
            bool: True if role was updated
        """
        try:
            premium_role_name = self.config.get('premium')
            if not premium_role_name:
                return False
            
            # Check if premium role exists in server
            premium_role = discord.utils.get(member.guild.roles, name=premium_role_name)
            if not premium_role:
                default_color = int(self.config.get('default_color', '0x3498db').replace('0x', ''), 16)
                premium_role = await member.guild.create_role(
                    name=premium_role_name,
                    color=discord.Color(default_color),
                    mentionable=True,
                    reason="BikeNode premium role creation"
                )
            
            # Check if user is premium
            user_id = await self.api.get_user_id(str(member.id))
            if not user_id:
                # User not linked, remove premium role if they have it
                if premium_role in member.roles:
                    await member.remove_roles(premium_role, reason="BikeNode account not linked")
                return False
            
            is_premium = await self.api.check_premium(user_id)
            
            # Update premium role
            has_role = premium_role in member.roles
            
            if is_premium and not has_role:
                await member.add_roles(premium_role, reason="BikeNode premium subscriber")
                return True
            elif not is_premium and has_role:
                await member.remove_roles(premium_role, reason="BikeNode premium expired")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating premium role for {member.name}: {e}")
            return False
    
    async def _get_server_settings(self, guild) -> Dict[str, Any]:
        """Get server settings from data file
        
        Args:
            guild: Discord guild
            
        Returns:
            dict: Server settings
        """
        settings_path = Path(__file__).parent.parent / 'data' / 'settings.json'
        
        try:
            import json
            if settings_path.exists():
                with open(settings_path, 'r') as f:
                    settings = json.load(f)
                    return settings.get(str(guild.id), {})
        except Exception as e:
            logger.error(f"Error loading server settings: {e}")
        
        return {'role_mode': 'brand'}
    
    async def update_roles_for_guild(self, guild: discord.Guild) -> int:
        """Update roles for all members in a guild
        
        Args:
            guild: Discord guild
            
        Returns:
            int: Number of members updated
        """
        count = 0
        async for member in guild.fetch_members():
            if not member.bot:
                success = await self.update_user_roles(member)
                if success:
                    count += 1
        return count
    
    async def sync_all_members(self, guild: discord.Guild) -> int:
        """Sync all members' roles with BikeNode data
        
        This is a more comprehensive sync that also removes
        roles from users who no longer have the relevant bikes
        
        Args:
            guild: Discord guild
            
        Returns: 
            int: Number of members updated
        """
        count = 0
        async for member in guild.fetch_members():
            if not member.bot:
                # Check if user exists in BikeNode
                user_id = await self.api.get_user_id(str(member.id))
                if user_id:
                    # Update roles for linked users
                    success = await self.update_user_roles(member)
                    if success:
                        count += 1
                else:
                    # Remove bike roles from unlinked users
                    bike_roles = [role for role in member.roles 
                                 if role.name.startswith(self.role_prefix)]
                    if bike_roles:
                        await member.remove_roles(*bike_roles, reason="BikeNode account not linked")
                        count += 1
        
        return count
