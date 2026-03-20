#!/usr/bin/env bash
set -euo pipefail

# Execute a GraphQL request against the Alkemio API using a stored session token.
#
# The query MUST be provided via a file to avoid shell escaping issues
# with special characters (!, $, etc.) when invoked through tools.
#
# Usage:
#   echo 'query { me { user { id } } }' > /tmp/.gql-query
#   ./gql-request.sh                          # query only
#   ./gql-request.sh /tmp/variables.json      # query + variables from file
#
# Requires: a valid session token at .claude/pipeline/.session-token
#           (run non-interactive-login.sh first)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/kratos.sh"
source "$SCRIPT_DIR/lib/graphql.sh"

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"
TOKEN_FILE="$PIPELINE_DIR/.session-token"
QUERY_FILE="/tmp/.gql-query"

# Load session token
if [ ! -f "$TOKEN_FILE" ]; then
  fail "No session token found at $TOKEN_FILE. Run non-interactive-login.sh first."
fi
SESSION_TOKEN=$(tr -d '\n' < "$TOKEN_FILE")
[ -n "$SESSION_TOKEN" ] || fail "Session token file is empty"

# Load query
if [ ! -f "$QUERY_FILE" ]; then
  fail "Query file not found at $QUERY_FILE. Write your query there before running."
fi
QUERY=$(cat "$QUERY_FILE")
rm -f "$QUERY_FILE"
[ -n "$QUERY" ] || fail "Query file is empty"

# Load optional variables
VARIABLES=""
if [ -n "${1:-}" ] && [ -f "$1" ]; then
  VARIABLES=$(cat "$1")
  rm -f "$1"
fi

# Execute
RESPONSE=$(gql_request "$QUERY" "$VARIABLES")
echo "$RESPONSE" | jq .
