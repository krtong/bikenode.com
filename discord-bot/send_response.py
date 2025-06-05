import requests
import json
import sys

# Read the pending message
with open('pending_discord_message.json', 'r') as f:
    message_data = json.load(f)

message_id = message_data['id']
user_message = message_data['message']
username = message_data['username']

# Create response
response_text = '✅ Testing received! The chatbot integration is working. I can see your Discord messages in real-time and respond. This is Claude Code responding from the terminal!'

# Send response
response = requests.post(
    'http://localhost:5555/respond',
    json={
        'message_id': message_id,
        'response': response_text
    }
)

print(f"Response sent: {response.status_code}")