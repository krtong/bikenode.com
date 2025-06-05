import discord
from discord.ext import commands
import json
import os
from datetime import datetime

class ClaudeFixed(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.messages_file = "claude_messages.json"
        self.responses_file = "claude_responses.json"
        self.ensure_files()
    
    def ensure_files(self):
        """Ensure JSON files exist"""
        for file in [self.messages_file, self.responses_file]:
            if not os.path.exists(file):
                with open(file, 'w') as f:
                    json.dump([], f)
    
    @commands.command(name='c')
    async def claude_message(self, ctx, *, message):
        """Send a message to Claude (shorthand: !bike c)"""
        # Load existing messages
        with open(self.messages_file, 'r') as f:
            messages = json.load(f)
        
        # Create message object
        msg_data = {
            'id': len(messages) + 1,
            'timestamp': datetime.now().isoformat(),
            'channel_id': ctx.channel.id,
            'user_id': ctx.author.id,
            'username': ctx.author.name,
            'message': message,
            'responded': False
        }
        
        # Append and save
        messages.append(msg_data)
        with open(self.messages_file, 'w') as f:
            json.dump(messages, f, indent=2)
        
        await ctx.send(f"📨 Message sent to Claude: '{message[:50]}{'...' if len(message) > 50 else ''}'")
        await ctx.send(f"Message ID: {msg_data['id']} - Check back with `!bike check` for a response.")
    
    @commands.command(name='check')
    async def check_responses(self, ctx, message_id: int = None):
        """Check for Claude's responses"""
        # Load responses
        try:
            with open(self.responses_file, 'r') as f:
                responses = json.load(f)
        except:
            responses = []
        
        if not responses:
            await ctx.send("No responses yet. Claude hasn't replied.")
            return
        
        # Filter responses for this channel
        channel_responses = [r for r in responses if r['channel_id'] == ctx.channel.id]
        
        if not channel_responses:
            await ctx.send("No responses for this channel yet.")
            return
        
        # If specific message ID requested
        if message_id:
            response = next((r for r in channel_responses if r['message_id'] == message_id), None)
            if not response:
                await ctx.send(f"No response found for message ID {message_id}")
                return
        else:
            # Get latest response
            response = channel_responses[-1]
        
        # Create embed
        embed = discord.Embed(
            title="💬 Claude's Response",
            description=response['response'],
            color=discord.Color.green()
        )
        embed.add_field(
            name="Your message", 
            value=response['original_message'][:200] + ('...' if len(response['original_message']) > 200 else ''),
            inline=False
        )
        embed.set_footer(text=f"Message ID: {response['message_id']} | Responded at {response['timestamp']}")
        
        await ctx.send(embed=embed)
    
    @commands.command(name='messages')
    async def list_messages(self, ctx):
        """List recent messages sent to Claude"""
        with open(self.messages_file, 'r') as f:
            messages = json.load(f)
        
        # Filter for this channel
        channel_messages = [m for m in messages if m['channel_id'] == ctx.channel.id]
        
        if not channel_messages:
            await ctx.send("No messages sent from this channel.")
            return
        
        # Show last 5 messages
        recent = channel_messages[-5:]
        
        embed = discord.Embed(
            title="📜 Recent Messages to Claude",
            color=discord.Color.blue()
        )
        
        for msg in recent:
            status = "✅ Responded" if msg.get('responded', False) else "⏳ Pending"
            embed.add_field(
                name=f"ID: {msg['id']} - {status}",
                value=f"{msg['username']}: {msg['message'][:100]}{'...' if len(msg['message']) > 100 else ''}",
                inline=False
            )
        
        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(ClaudeFixed(bot))