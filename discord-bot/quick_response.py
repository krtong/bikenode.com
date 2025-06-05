import requests
import json

# Read the pending message
with open('pending_discord_message.json', 'r') as f:
    message_data = json.load(f)

message_id = message_data['id']

# Send response
response = requests.post(
    'http://localhost:5555/respond',
    json={
        'message_id': message_id,
        'response': 'Hi Kevin! 👋 This is Claude Code responding in real-time. If you see this message in Discord, it means the bot can successfully post responses! The integration is working!'
    }
)

print(f"Response sent: {response.status_code}")