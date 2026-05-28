#!/usr/bin/env bash
set -euo pipefail

# Cookie-authenticated GraphQL request against the Alkemio interactive
# endpoint (`/api/private/graphql`). The cookie causes Oathkeeper to
# exchange the Kratos session for a JWT with actor identity, so
# downstream services (WOPI, etc.) and `@CurrentActor` privilege checks
# resolve to the logged-in user — unlike gql-request.sh, which uses a
# Bearer token on the non-interactive endpoint and resolves to anonymous
# for any user-bound privilege check.
#
# Usage (mirrors gql-request.sh — same query/variables file pattern):
#   echo 'query { me { user { id } } }' > /tmp/.gql-query
#   ./gql-request-interactive.sh                          # query only
#   ./gql-request-interactive.sh /tmp/variables.json      # query + variables
#
# Requires: a valid cookie jar at .claude/pipeline/.cookie-jar
#           (run interactive-login.sh first)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/kratos.sh"
source "$SCRIPT_DIR/lib/graphql.sh"

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
PIPELINE_DIR="$PROJECT_DIR/.claude/pipeline"
COOKIE_JAR="$PIPELINE_DIR/.cookie-jar"
QUERY_FILE="/tmp/.gql-query"

if [ ! -f "$COOKIE_JAR" ]; then
  fail "No cookie jar found at $COOKIE_JAR. Run interactive-login.sh first."
fi
export COOKIE_JAR

if [ ! -f "$QUERY_FILE" ]; then
  fail "Query file not found at $QUERY_FILE. Write your query there before running."
fi
QUERY=$(cat "$QUERY_FILE")
rm -f "$QUERY_FILE"
[ -n "$QUERY" ] || fail "Query file is empty"

VARIABLES=""
if [ -n "${1:-}" ] && [ -f "$1" ]; then
  VARIABLES=$(cat "$1")
  rm -f "$1"
fi

RESPONSE=$(gql_request_interactive "$QUERY" "$VARIABLES")
echo "$RESPONSE" | jq .
