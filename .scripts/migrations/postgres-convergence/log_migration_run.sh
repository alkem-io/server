#!/bin/bash
# log_migration_run.sh - Log migration events with timestamps
# Usage: ./log_migration_run.sh <status> <message>
# Status values: started, in_progress, completed, rolled_back, failed

set -e

# Base directory: the location of the script
BASE_DIR="$(dirname "$(realpath "$0")")"

# Migration log file
LOG_FILE="${BASE_DIR}/migration_log.json"

# Validate arguments
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <status> [message]"
    echo "Status values: started, in_progress, completed, rolled_back, failed"
    exit 1
fi

STATUS="$1"
MESSAGE="${2:-}"

# Validate status
case "$STATUS" in
    started|in_progress|completed|rolled_back|failed)
        ;;
    *)
        echo "Error: Invalid status '$STATUS'"
        echo "Valid values: started, in_progress, completed, rolled_back, failed"
        exit 1
        ;;
esac

# Get current timestamp in ISO 8601 format
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get hostname and user for audit trail
HOSTNAME=$(hostname)
USERNAME=$(whoami)

# Create log entry
LOG_ENTRY=$(cat <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "status": "${STATUS}",
  "message": "${MESSAGE}",
  "host": "${HOSTNAME}",
  "user": "${USERNAME}"
}
EOF
)

# Initialize log file if it doesn't exist
if [ ! -f "$LOG_FILE" ]; then
    echo '{"migration_runs": []}' > "$LOG_FILE"
fi

# Append entry to log file using jq if available, otherwise use sed
if command -v jq &> /dev/null; then
    # Use jq to properly append to JSON array
    TEMP_FILE=$(mktemp)
    jq --argjson entry "$LOG_ENTRY" '.migration_runs += [$entry]' "$LOG_FILE" > "$TEMP_FILE"
    mv "$TEMP_FILE" "$LOG_FILE"
else
    # Fallback: append to a simple log format
    echo "$LOG_ENTRY" >> "${LOG_FILE%.json}.ndjson"
    echo "Warning: jq not installed, logging to ${LOG_FILE%.json}.ndjson"
fi

# Also print to stdout
echo "[$TIMESTAMP] Migration $STATUS: $MESSAGE"
echo "Logged to: $LOG_FILE"
