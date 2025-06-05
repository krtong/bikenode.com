import discord
from discord.ext import commands
import json
import os
from datetime import datetime

class ClaudeSimple(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.messages_file = "claude_messages.txt"
        self.responses_file = "claude_responses.txt"
    
    @commands.command(name='c')
    async def claude_message(self, ctx, *, message):
        """Send a message to Claude (shorthand: !bike c)"""
        # Append message to file
        with open(self.messages_file, 'a') as f:
            msg_line = f"{datetime.now().isoformat()}|{ctx.channel.id}|{ctx.author.id}|{ctx.author.name}|{message}\n"
            f.write(msg_line)
        
        await ctx.send(f"📨 Message sent to Claude: '{message[:50]}{'...' if len(message) > 50 else ''}'")
        await ctx.send(f"Check back with `!bike check` for a response.")
    
    @commands.command(name='check')
    async def check_responses(self, ctx):
        """Check for Claude's responses"""
        if not os.path.exists(self.responses_file):
            await ctx.send("No responses yet. Claude hasn't replied.")
            return
        
        with open(self.responses_file, 'r') as f:
            lines = f.readlines()
        
        if not lines:
            await ctx.send("No responses yet.")
            return
        
        # Get latest response for this channel
        channel_responses = []
        for line in lines:
            try:
                parts = line.strip().split('|', 4)
                if len(parts) >= 5:
                    timestamp, channel_id, user_id, original_msg, response = parts
                    if int(channel_id) == ctx.channel.id:
                        channel_responses.append({
                            'timestamp': timestamp,
                            'user_id': int(user_id),
                            'original': original_msg,
                            'response': response
                        })
            except:
                continue
        
        if not channel_responses:
            await ctx.send("No responses for this channel yet.")
            return
        
        # Show latest response
        latest = channel_responses[-1]
        embed = discord.Embed(
            title="💬 Claude's Response",
            description=latest['response'],
            color=discord.Color.green()
        )
        embed.add_field(
            name="Your message", 
            value=latest['original'][:200] + ('...' if len(latest['original']) > 200 else ''),
            inline=False
        )
        embed.set_footer(text=f"Responded at {latest['timestamp']}")
        
        await ctx.send(embed=embed)

async def setup(bot):
    await bot.add_cog(ClaudeSimple(bot))