#!/bin/bash
# Quick status check for overmind processes
# Usage: ./status.sh

cd "$(dirname "$0")"

# Check if overmind is running
if [[ ! -S ".overmind.sock" ]]; then
  echo "Overmind not running (no .overmind.sock found)"
  exit 1
fi

export PATH="$HOME/.local/bin:$PATH"

echo "=== Overmind Status $(date +%H:%M:%S) ==="
echo ""

# Show process status
overmind ps

echo ""
echo "=== Recent Output (last 10 lines) ==="
# Use overmind echo to get recent output - but it blocks, so we use timeout
timeout 1 overmind echo 2>/dev/null | tail -10 || echo "(use 'overmind connect <proc>' for live output)"

echo ""
echo "=== Commands ==="
echo "  overmind connect ts    - Attach to TypeScript watcher"
echo "  overmind connect test  - Attach to Jest"
echo "  overmind connect app   - Attach to NestJS"
echo "  overmind restart app   - Restart app"
echo "  overmind stop          - Stop all processes"
