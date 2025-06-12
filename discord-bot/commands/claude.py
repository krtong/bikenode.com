import discord
from discord.ext import commands, tasks
import json
import os
from datetime import datetime
import asyncio

class ClaudeCommands(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.messages_file = os.path.join("data", "claude_messages.json")
        self.ensure_data_dir()
        
    def ensure_data_dir(self):
        os.makedirs("data", exist_ok=True)
        if not os.path.exists(self.messages_file):
            with open(self.messages_file, 'w') as f:
                json.dump([], f)
    
    @commands.command(name='claude')
    async def send_to_claude(self, ctx, *, message):
        """Send a message to Claude"""
        # Save the message
        messages = self.load_messages()
        msg_data = {
            "id": len(messages) + 1,
            "user": str(ctx.author),
            "user_id": ctx.author.id,
            "channel_id": ctx.channel.id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "responded": False,
            "response": None
        }
        messages.append(msg_data)
        self.save_messages(messages)
        
        await ctx.send(f"📨 Message sent to Claude! Check back later for a response. (Message ID: {msg_data['id']})")
    
    @commands.command(name='claude_check')
    async def check_response(self, ctx, message_id: int = None):
        """Check for Claude's response"""
        messages = self.load_messages()
        
        if message_id:
            # Check specific message
            msg = next((m for m in messages if m['id'] == message_id), None)
            if not msg:
                await ctx.send("❌ Message not found!")
                return
            
            if msg['responded']:
                embed = discord.Embed(
                    title=f"Claude's Response to Message #{msg['id']}",
                    description=msg['response'],
                    color=discord.Color.green()
                )
                embed.add_field(name="Original Message", value=msg['message'][:100] + "..." if len(msg['message']) > 100 else msg['message'], inline=False)
                await ctx.send(embed=embed)
            else:
                await ctx.send(f"⏳ Still waiting for Claude's response to message #{msg['id']}")
        else:
            # Show all pending messages
            pending = [m for m in messages if not m['responded']]
            if pending:
                embed = discord.Embed(
                    title="Pending Messages",
                    description=f"Found {len(pending)} messages waiting for responses",
                    color=discord.Color.orange()
                )
                for msg in pending[:5]:  # Show first 5
                    embed.add_field(
                        name=f"Message #{msg['id']} from {msg['user']}",
                        value=msg['message'][:50] + "..." if len(msg['message']) > 50 else msg['message'],
                        inline=False
                    )
                await ctx.send(embed=embed)
            else:
                await ctx.send("✅ No pending messages!")
    
    @commands.command(name='claude_list')
    async def list_messages(self, ctx):
        """List recent messages to Claude"""
        messages = self.load_messages()
        if not messages:
            await ctx.send("No messages yet!")
            return
        
        # Show last 10 messages
        recent = messages[-10:]
        embed = discord.Embed(
            title="Recent Claude Messages",
            color=discord.Color.blue()
        )
        
        for msg in recent:
            status = "✅" if msg['responded'] else "⏳"
            embed.add_field(
                name=f"{status} Message #{msg['id']} - {msg['user']}",
                value=msg['message'][:50] + "..." if len(msg['message']) > 50 else msg['message'],
                inline=False
            )
        
        await ctx.send(embed=embed)
    
    def load_messages(self):
        try:
            with open(self.messages_file, 'r') as f:
                return json.load(f)
        except:
            return []
    
    def save_messages(self, messages):
        with open(self.messages_file, 'w') as f:
            json.dump(messages, f, indent=2)

async def setup(bot):
    await bot.add_cog(ClaudeCommands(bot))