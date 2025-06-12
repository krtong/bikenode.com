import discord
from discord.ext import commands, tasks
import json
import os
from datetime import datetime, timedelta
import asyncio
import threading
import time

class ClaudeChatCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.conversations_file = os.path.join("data", "claude_conversations.json")
        self.updates_file = os.path.join("data", "claude_updates.json")
        self.ensure_data_dir()
        self.active_conversations = {}
        # Start the update checker
        self.check_updates.start()
    
    def ensure_data_dir(self):
        os.makedirs("data", exist_ok=True)
        for file in [self.conversations_file, self.updates_file]:
            if not os.path.exists(file):
                with open(file, 'w') as f:
                    json.dump({}, f)
    
    @commands.command(name='chat')
    async def chat_with_claude(self, ctx, *, message):
        """Start or continue a conversation with Claude"""
        channel_id = str(ctx.channel.id)
        
        # Load or create conversation
        conversations = self.load_conversations()
        if channel_id not in conversations:
            conversations[channel_id] = {
                "id": channel_id,
                "started": datetime.now().isoformat(),
                "messages": [],
                "user": str(ctx.author),
                "last_activity": datetime.now().isoformat()
            }
        
        # Add the new message
        msg_data = {
            "id": len(conversations[channel_id]["messages"]) + 1,
            "user": str(ctx.author),
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "status": "received"
        }
        conversations[channel_id]["messages"].append(msg_data)
        conversations[channel_id]["last_activity"] = datetime.now().isoformat()
        self.save_conversations(conversations)
        
        # Send initial acknowledgment
        embed = discord.Embed(
            title="💬 Message Received",
            description=f"Processing your message...",
            color=discord.Color.blue()
        )
        embed.add_field(name="Your message", value=message[:200] + "..." if len(message) > 200 else message, inline=False)
        status_msg = await ctx.send(embed=embed)
        
        # Store the status message for updates
        self.active_conversations[channel_id] = {
            "message": status_msg,
            "msg_id": msg_data["id"],
            "start_time": time.time()
        }
        
        # Save update request
        updates = self.load_updates()
        updates[f"{channel_id}_{msg_data['id']}"] = {
            "channel_id": channel_id,
            "message_id": msg_data["id"],
            "status": "pending",
            "updates": []
        }
        self.save_updates(updates)
    
    @tasks.loop(seconds=2)
    async def check_updates(self):
        """Check for updates from Claude"""
        updates = self.load_updates()
        conversations = self.load_conversations()
        
        for key, update_data in updates.items():
            if update_data["status"] == "completed":
                continue
                
            channel_id = update_data["channel_id"]
            msg_id = update_data["message_id"]
            
            # Check if we have an active conversation
            if channel_id in self.active_conversations:
                active = self.active_conversations[channel_id]
                
                # Update the embed with any new updates
                if update_data["updates"]:
                    last_update = update_data["updates"][-1]
                    
                    if last_update["type"] == "progress":
                        embed = discord.Embed(
                            title="🔄 Claude is working...",
                            description=last_update["content"],
                            color=discord.Color.orange()
                        )
                        embed.add_field(name="Status", value=f"⏳ {last_update.get('detail', 'Processing...')}", inline=False)
                        
                    elif last_update["type"] == "response":
                        embed = discord.Embed(
                            title="✅ Claude's Response",
                            description=last_update["content"],
                            color=discord.Color.green()
                        )
                        # Mark as completed
                        update_data["status"] = "completed"
                        self.save_updates(updates)
                        
                        # Update conversation
                        if channel_id in conversations:
                            for msg in conversations[channel_id]["messages"]:
                                if msg["id"] == msg_id:
                                    msg["status"] = "responded"
                                    msg["response"] = last_update["content"]
                                    break
                            self.save_conversations(conversations)
                        
                        # Remove from active conversations
                        del self.active_conversations[channel_id]
                    
                    # Add timestamp
                    elapsed = int(time.time() - active["start_time"])
                    embed.set_footer(text=f"Time elapsed: {elapsed}s")
                    
                    try:
                        await active["message"].edit(embed=embed)
                    except:
                        pass  # Message might have been deleted
    
    @check_updates.before_loop
    async def before_check_updates(self):
        await self.bot.wait_until_ready()
    
    @commands.command(name='chat_history')
    async def show_history(self, ctx):
        """Show conversation history in this channel"""
        channel_id = str(ctx.channel.id)
        conversations = self.load_conversations()
        
        if channel_id not in conversations:
            await ctx.send("No conversation history in this channel.")
            return
        
        conv = conversations[channel_id]
        recent_messages = conv["messages"][-5:]  # Last 5 messages
        
        embed = discord.Embed(
            title="📜 Conversation History",
            description=f"Showing last {len(recent_messages)} messages",
            color=discord.Color.blue()
        )
        
        for msg in recent_messages:
            status_icon = "✅" if msg["status"] == "responded" else "⏳"
            value = msg["message"][:100] + "..." if len(msg["message"]) > 100 else msg["message"]
            if msg.get("response"):
                value += f"\n**Claude:** {msg['response'][:100]}..."
            embed.add_field(
                name=f"{status_icon} {msg['user']} - Message #{msg['id']}",
                value=value,
                inline=False
            )
        
        await ctx.send(embed=embed)
    
    @commands.command(name='chat_clear')
    async def clear_conversation(self, ctx):
        """Clear conversation history in this channel"""
        channel_id = str(ctx.channel.id)
        conversations = self.load_conversations()
        
        if channel_id in conversations:
            del conversations[channel_id]
            self.save_conversations(conversations)
            await ctx.send("✅ Conversation history cleared!")
        else:
            await ctx.send("No conversation to clear.")
    
    def load_conversations(self):
        try:
            with open(self.conversations_file, 'r') as f:
                return json.load(f)
        except:
            return {}
    
    def save_conversations(self, conversations):
        with open(self.conversations_file, 'w') as f:
            json.dump(conversations, f, indent=2)
    
    def load_updates(self):
        try:
            with open(self.updates_file, 'r') as f:
                return json.load(f)
        except:
            return {}
    
    def save_updates(self, updates):
        with open(self.updates_file, 'w') as f:
            json.dump(updates, f, indent=2)

async def setup(bot):
    await bot.add_cog(ClaudeChatCommands(bot))