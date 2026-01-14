#!/bin/bash
# Alkemio Server Feedback Aggregator
#
# Watches overmind output and aggregates errors to .feedback.log
# Run in a separate terminal while overmind is active.
#
# Usage: ./monitor.sh

cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"

LOG_FILE=".feedback.log"

# Check if overmind is running
if [[ ! -S ".overmind.sock" ]]; then
  echo "Overmind not running (no .overmind.sock found)"
  exit 1
fi

echo "Monitoring overmind processes..."
echo "Output: $LOG_FILE"
echo "Press Ctrl+C to stop"
echo ""

# Clear log
> "$LOG_FILE"

# Use overmind echo and filter for errors
overmind echo 2>/dev/null | while IFS= read -r line; do
  timestamp=$(date +%H:%M:%S)

  # Check for errors in the line
  if echo "$line" | grep -qiE '(error|FAIL|exception|✕|TS[0-9]+)'; then
    # Strip ANSI codes for cleaner logging
    clean_line=$(echo "$line" | sed 's/\x1b\[[0-9;]*m//g')
    echo "[$timestamp] $clean_line" >> "$LOG_FILE"
    echo -e "\033[0;31m[$timestamp] ERROR: $clean_line\033[0m"
  fi
done
