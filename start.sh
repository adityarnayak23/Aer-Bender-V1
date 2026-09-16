#!/usr/bin/env bash
# Startup script for Air Flute
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=8081

while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    PORT=$((PORT + 1))
done

echo "======================================================="
echo "  🪈 Starting Air Flute on http://localhost:$PORT  "
echo "======================================================="
echo "Opening your browser..."

sleep 1 && open "http://localhost:$PORT" &

node server.js
