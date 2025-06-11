import requests

try:
    response = requests.get('http://localhost:5555/health')
    print(f"Server status: {response.json()}")
except Exception as e:
    print(f"Error: {e}")