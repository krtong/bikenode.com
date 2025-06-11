#!/bin/bash
# BikeNode Development Server Runner

echo "Starting BikeNode development servers..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Go is not installed. Please install Go first."
    exit 1
fi

# Check if Go server is already running on port 8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "✓ Go API server is already running on port 8080"
else
    # Start the Go API server in the background
    echo "Starting Go API server on port 8080..."
    cd /Users/kevintong/Documents/Code/bikenode.com/website/api-server
    go run main.go &
    GO_PID=$!
    
    # Give the Go server a moment to start
    sleep 2
fi

# Start the Eleventy dev server
echo "Starting Eleventy dev server on port 8081..."
npm run dev-frontend

# If we started the Go server, stop it when Eleventy is stopped
if [ ! -z "$GO_PID" ]; then
    kill $GO_PID
    echo "Stopped Go API server."
fi
echo "Development servers stopped."