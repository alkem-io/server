#!/usr/bin/env bash
# Shared GraphQL helpers for pipeline scripts.
# Source this file; do NOT execute it directly.
#
# Requires: curl, jq
# Provides: gql_request
# Expects:  SESSION_TOKEN (set by kratos_login or read from token file)
#           GQL_ENDPOINT  (defaults to http://localhost:3000/api/private/non-interactive/graphql)

GQL_ENDPOINT="${GRAPHQL_NON_INTERACTIVE_ENDPOINT:-http://localhost:3000/api/private/non-interactive/graphql}"

# Execute a GraphQL request and return the full JSON response.
# Fails with error details if the response contains errors and no data.
#
# Usage:
#   gql_request '<query>'                          # query only
#   gql_request '<query>' '<variables_json>'       # query + variables
#
# Requires SESSION_TOKEN to be set.
#
# Example:
#   gql_request 'query { me { user { id } } }'
#   gql_request 'mutation($input: CreateSpaceInput!) { createSpace(spaceData: $input) { id } }' \
#               '{"input":{"nameID":"test"}}'
gql_request() {
  local query="$1"
  local variables="${2:-}"

  [ -n "${SESSION_TOKEN:-}" ] || { echo "ERROR: SESSION_TOKEN is not set" >&2; return 1; }

  local payload
  if [ -n "$variables" ]; then
    payload=$(jq -nc --arg q "$query" --argjson v "$variables" '{query:$q, variables:$v}')
  else
    payload=$(jq -nc --arg q "$query" '{query:$q}')
  fi

  local response
  response=$(curl -s -X POST "$GQL_ENDPOINT" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -d "$payload")

  # Print the response (caller extracts what they need)
  echo "$response"

  # Return non-zero if there are errors and no data
  local has_data has_errors
  has_data=$(echo "$response" | jq -r '.data // empty')
  has_errors=$(echo "$response" | jq -r '.errors // empty')
  if [ -z "$has_data" ] && [ -n "$has_errors" ]; then
    echo "GraphQL error: $(echo "$response" | jq -c '.errors')" >&2
    return 1
  fi
}
