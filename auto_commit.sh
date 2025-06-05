#!/bin/bash

# Auto-commit script for BikeNode project
# Commits changes every few minutes if there are any

INTERVAL=300  # 5 minutes in seconds
PROJECT_DIR="/Users/kevintong/Documents/Code/bikenode.com"

echo "Starting auto-commit script..."
echo "Will check for changes every 5 minutes"
echo "Press Ctrl+C to stop"

while true; do
    cd "$PROJECT_DIR"
    
    # Check if there are any changes
    if [[ -n $(git status --porcelain) ]]; then
        echo "$(date): Changes detected, committing..."
        
        # Add all changes
        git add -A
        
        # Create commit with timestamp
        git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')

Automatic commit of work in progress

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        
        # Push to remote
        git push
        
        echo "$(date): Committed and pushed successfully"
    else
        echo "$(date): No changes to commit"
    fi
    
    # Wait for the interval
    sleep $INTERVAL
done