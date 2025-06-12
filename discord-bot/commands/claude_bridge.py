import discord
from discord.ext import commands, tasks
import json
import os
from datetime import datetime
import asyncio

class ClaudeBridge(commands.Cog):
    """Bridge between Discord and Claude - real bidirectional communication"""
    
    def __init__(self, bot):
        self.bot = bot
        self.queue_file = "claude_queue.json"
        self.responses_file = "claude_responses.json"
        self.ensure_files()
        # Start checking for responses
        self.check_responses.start()
    
    def ensure_files(self):
        """Ensure queue files exist"""
        for file in [self.queue_file, self.responses_file]:
            if not os.path.exists(file):
                with open(file, 'w') as f:
                    json.dump({}, f)
    
    @commands.command(name='ask')
    async def ask_claude(self, ctx, *, message):
        """Send a message to Claude and wait for response"""
        # Create unique message ID
        msg_id = f"{ctx.channel.id}_{datetime.now().timestamp()}"
        
        # Save to queue
        queue = self.load_json(self.queue_file)
        queue[msg_id] = {
            "id": msg_id,
            "channel_id": ctx.channel.id,
            "user": str(ctx.author),
            "user_id": ctx.author.id,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "status": "pending"
        }
        self.save_json(self.queue_file, queue)
        
        # Send confirmation
        embed = discord.Embed(
            title="📤 Message Sent to Claude",
            description=f"Your message has been queued.",
            color=discord.Color.blue()
        )
        embed.add_field(name="Your Message", value=message[:1000], inline=False)
        embed.set_footer(text=f"Message ID: {msg_id}")
        await ctx.send(embed=embed)
    
    @commands.command(name='status')
    async def check_status(self, ctx):
        """Check status of pending messages"""
        queue = self.load_json(self.queue_file)
        responses = self.load_json(self.responses_file)
        
        pending = [m for m in queue.values() if m.get("status") == "pending"]
        completed = [m for m in responses.values() if m.get("delivered", False)]
        
        embed = discord.Embed(
            title="📊 Claude Bridge Status",
            color=discord.Color.green()
        )
        embed.add_field(name="Pending Messages", value=str(len(pending)), inline=True)
        embed.add_field(name="Completed Responses", value=str(len(completed)), inline=True)
        
        if pending:
            recent = pending[:3]
            messages = []
            for msg in recent:
                preview = msg['message'][:50] + "..." if len(msg['message']) > 50 else msg['message']
                messages.append(f"• {msg['user']}: {preview}")
            embed.add_field(name="Recent Pending", value="\n".join(messages), inline=False)
        
        await ctx.send(embed=embed)
    
    @tasks.loop(seconds=2)
    async def check_responses(self):
        """Check for Claude's responses and deliver them"""
        responses = self.load_json(self.responses_file)
        
        for msg_id, response_data in responses.items():
            if response_data.get("delivered", False):
                continue
            
            # Find the channel
            channel_id = response_data.get("channel_id")
            if not channel_id:
                continue
            
            channel = self.bot.get_channel(int(channel_id))
            if not channel:
                continue
            
            # Send the response
            try:
                embed = discord.Embed(
                    title="💬 Claude's Response",
                    description=response_data["response"][:4000],  # Discord limit
                    color=discord.Color.green()
                )
                
                # Add original message reference
                if "original_message" in response_data:
                    orig = response_data["original_message"][:200]
                    if len(response_data["original_message"]) > 200:
                        orig += "..."
                    embed.add_field(name="Your Message", value=orig, inline=False)
                
                embed.set_footer(text=f"Response time: {response_data.get('response_time', 'N/A')}")
                
                await channel.send(embed=embed)
                
                # Mark as delivered
                response_data["delivered"] = True
                response_data["delivered_at"] = datetime.now().isoformat()
                self.save_json(self.responses_file, responses)
                
                # Update queue status
                queue = self.load_json(self.queue_file)
                if msg_id in queue:
                    queue[msg_id]["status"] = "completed"
                    self.save_json(self.queue_file, queue)
                
            except Exception as e:
                print(f"Error delivering response: {e}")
    
    @check_responses.before_loop
    async def before_check_responses(self):
        await self.bot.wait_until_ready()
    
    def load_json(self, filename):
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except:
            return {}
    
    def save_json(self, filename, data):
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)

async def setup(bot):
    await bot.add_cog(ClaudeBridge(bot))