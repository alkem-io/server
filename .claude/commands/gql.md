---
description: Execute a GraphQL query or mutation against the Alkemio API using the pipeline session token
arguments:
  - name: query
    description: "The GraphQL query or mutation to execute (e.g., 'query { me { user { id } } }')"
    required: true
---

Execute a GraphQL request against the Alkemio server's non-interactive API endpoint.

## Prerequisites

A valid session token must exist at `.claude/pipeline/.session-token`. If not, run `/non-interactive-login` first.

## Execution steps

IMPORTANT: The query must be written to a file to avoid shell escaping issues with GraphQL syntax (`!`, `$`, `{`, etc.).

1. **Write the query** to `/tmp/.gql-query` using the **Write** tool (exactly as provided, no escaping)
2. **If variables are needed**, write the variables JSON to `/tmp/.gql-variables` using the **Write** tool
3. **Run the script**:

```bash
# Without variables:
.scripts/gql-request.sh

# With variables:
.scripts/gql-request.sh /tmp/.gql-variables
```

4. Parse and present the JSON response to the user in a readable format

## Examples

### Simple query — current user
```graphql
query { me { user { id nameID profile { displayName } } } }
```

### Query with variables — space by ID
```graphql
query SpaceById($id: UUID!) {
  lookup {
    space(ID: $id) {
      id
      nameID
      profile { displayName }
    }
  }
}
```
Variables: `{"id": "some-uuid-here"}`

### Mutation — update profile
```graphql
mutation UpdateProfile($input: UpdateProfileDirectInput!) {
  updateProfile(profileData: $input) {
    id
    displayName
  }
}
```
Variables: `{"input": {"profileID": "some-uuid", "displayName": "New Name"}}`

### Introspection — list all query fields
```graphql
query { __schema { queryType { fields { name description } } } }
```

## Troubleshooting

- **"No session token found"** → Run `/non-interactive-login` first
- **"401 Unauthorized"** → Token may be expired, re-run `/non-interactive-login`
- **GraphQL errors** → Check query syntax; use introspection to discover the schema
