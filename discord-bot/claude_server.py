#!/usr/bin/env python3
"""
Claude Code Communication Server
This server receives Discord messages and I can respond through it
"""

from flask import Flask, request, jsonify
import json
import os
import time
import threading
import queue

app = Flask(__name__)

# Message queue for Claude Code to see
message_queue = queue.Queue()
# Response storage
responses = {}

@app.route('/message', methods=['POST'])
def receive_message():
    """Receive message from Discord bot"""
    data = request.json
    message_id = data.get('id')
    
    # Add to queue for Claude to see
    message_queue.put(data)
    
    # Save to file so Claude can see it
    with open('pending_discord_message.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"📨 NEW DISCORD MESSAGE (ID: {message_id})")
    print(f"From: {data.get('username')}")
    print(f"Message: {data.get('message')}")
    print(f"{'='*60}")
    print("⏳ Claude Code: Respond by calling the /respond endpoint")
    print(f"{'='*60}\n")
    
    # Wait for response (max 60 seconds)
    timeout = 60
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if message_id in responses:
            response = responses.pop(message_id)
            # Clean up the pending message file
            if os.path.exists('pending_discord_message.json'):
                os.remove('pending_discord_message.json')
            return jsonify({
                'success': True,
                'response': response
            })
        time.sleep(0.1)
    
    return jsonify({
        'success': False,
        'error': 'Timeout waiting for Claude Code'
    })

@app.route('/respond', methods=['POST'])
def save_response():
    """Claude Code can call this to respond"""
    data = request.json
    message_id = data.get('message_id')
    response = data.get('response')
    
    responses[message_id] = response
    print(f"✅ Response saved for message {message_id}")
    
    return jsonify({'success': True})

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'running'})

if __name__ == '__main__':
    print("🚀 Claude Code Communication Server")
    print("Running on http://localhost:5555")
    print("The Discord bot can send messages here")
    print("="*60)
    app.run(host='localhost', port=5555, debug=False)