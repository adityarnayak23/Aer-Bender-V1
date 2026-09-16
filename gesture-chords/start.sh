#!/usr/bin/env bash
# Startup script for GestureChords
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=8080

# Check if port 8080 is in use, if so find next available port
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    PORT=$((PORT + 1))
done

echo "======================================================="
echo "  🎵 Starting GestureChords on http://localhost:$PORT  "
echo "======================================================="
echo "Opening your browser..."

# Open browser on macOS
sleep 1 && open "http://localhost:$PORT" &

# Start python static server
python3 -m http.server $PORT
