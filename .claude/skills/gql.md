# GraphQL Requests

When asked to execute GraphQL queries or mutations against the Alkemio API, or when you need to interact with the API as part of a task, follow this guide.

## Overview

The GQL pipeline uses a stored Kratos session token to authenticate requests against the non-interactive GraphQL endpoint. Queries and variables are passed via temp files to avoid shell escaping issues.

**Scripts involved:**
- `.scripts/gql-request.sh` — standalone GQL executor
- `.scripts/lib/graphql.sh` — shared `gql_request` function (for use in other scripts)
- `.scripts/lib/kratos.sh` — shared Kratos auth helpers

## Prerequisites

### 1. Session Token

A valid session token must exist at `.claude/pipeline/.session-token`.

```bash
# Check if token exists
test -f .claude/pipeline/.session-token && echo "OK" || echo "Missing - run /non-interactive-login"
```

If missing or expired, acquire one first:
```bash
.scripts/non-interactive-login.sh
```

### 2. Pipeline Config

Ensure `.claude/pipeline/.env` has the required variables:
- `PIPELINE_USER` — email of the service account
- `PIPELINE_PASSWORD` — password for the service account
- `GRAPHQL_NON_INTERACTIVE_ENDPOINT` — API endpoint (defaults to `http://localhost:3000/api/private/non-interactive/graphql`)

### 3. Running Services

The Alkemio server must be running:
```bash
pnpm run start:services  # infrastructure
pnpm start:dev           # server
```

## Executing Queries

IMPORTANT: Always write queries and variables via the **Write** tool to avoid shell escaping issues with GraphQL syntax (`!`, `$`, `{`, etc.). Never pass them as Bash command arguments.

### Step-by-step

1. **Write the query** to `/tmp/.gql-query` using the Write tool
2. **If variables are needed**, write the JSON to `/tmp/.gql-variables` using the Write tool
3. **Run the script**:

```bash
# Without variables
.scripts/gql-request.sh

# With variables
.scripts/gql-request.sh /tmp/.gql-variables
```

The script auto-deletes the temp files after reading them.

### Using the lib in other scripts

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/kratos.sh"
source "$SCRIPT_DIR/lib/graphql.sh"

# SESSION_TOKEN must be set (e.g., via kratos_login or read from token file)
SESSION_TOKEN=$(cat .claude/pipeline/.session-token)

# Query only
response=$(gql_request 'query { me { user { id } } }')

# Query with variables
response=$(gql_request \
  'query($id: UUID!) { lookup { space(ID: $id) { id nameID } } }' \
  '{"id": "some-uuid"}')
```

## Schema Reference

The full GraphQL schema is at `schema.graphql` in the repository root. **Always consult it before writing queries** to verify field names, types, and nesting:

```bash
# Read the schema (or use the Read tool directly on schema.graphql)
```

Key things to know:
- `Space` has `about` (not `profile` directly) — use `space { about { profile { displayName } } }`
- `User` has `profile` directly — use `user { profile { displayName } }`
- Non-null fields are marked with `!` in the schema
- Use `lookup` / `lookupByName` for direct entity access (see **Entity Lookup** section below)
- Pagination uses `limit` / `offset` on collection queries

When unsure about a type's fields, either read the schema file or use introspection:
```graphql
query { __type(name: "TypeName") { fields { name type { name kind ofType { name } } } } }
```

## Entity Lookup (lookup & lookupByName)

The API provides two direct-access entry points under `query { lookup { ... } }` and `query { lookupByName { ... } }`. **Always prefer these over listing + filtering** — they save roundtrips and return exactly one entity.

### `lookup` — fetch by UUID

Use when you have an entity's UUID. Returns the full entity object.

```graphql
query { lookup { <entity>(ID: $id) { ...fields } } }
```

**Available entities** (all take `ID: UUID!`):

| Entity | Return Type | Entity | Return Type |
|--------|-------------|--------|-------------|
| `space` | `Space` | `user` | `User` |
| `organization` | `Organization` | `virtualContributor` | `VirtualContributor` |
| `account` | `Account` | `community` | `Community` |
| `collaboration` | `Collaboration` | `callout` | `Callout` |
| `calloutsSet` | `CalloutsSet` | `contribution` | `CalloutContribution` |
| `post` | `Post` | `whiteboard` | `Whiteboard` |
| `profile` | `Profile` | `roleSet` | `RoleSet` |
| `room` | `Room` | `template` | `Template` |
| `templatesSet` | `TemplatesSet` | `templatesManager` | `TemplatesManager` |
| `innovationHub` | `InnovationHub` | `innovationPack` | `InnovationPack` |
| `innovationFlow` | `InnovationFlow` | `knowledgeBase` | `KnowledgeBase` |
| `about` | `SpaceAbout` | `document` | `Document` |
| `invitation` | `Invitation` | `application` | `Application` |
| `calendar` | `Calendar` | `calendarEvent` | `CalendarEvent` |
| `conversation` | `Conversation` | `memo` | `Memo` |
| `storageBucket` | `StorageBucket` | `storageAggregator` | `StorageAggregator` |
| `license` | `License` | `communityGuidelines` | `CommunityGuidelines` |

Special lookups:
- `authorizationPolicy(ID: UUID!)` → `Authorization`
- `authorizationPrivilegesForUser(authorizationPolicyID: UUID!, userID: UUID!)` → `[AuthorizationPrivilege!]`
- `myPrivileges` → `LookupMyPrivilegesQueryResults` (sub-lookups for privilege checks)

### `lookupByName` — resolve by NameID

Use when you have a human-readable `nameID` (slug) instead of a UUID. **Most return a UUID string**, except `space` which returns the full `Space` object.

```graphql
query { lookupByName { <entity>(NAMEID: $nameId) } }
```

**Available entities** (all take `NAMEID: NameID!`):

| Entity | Return Type | Notes |
|--------|-------------|-------|
| `space` | `Space` | Returns full Space object |
| `user` | `String` | Returns UUID |
| `organization` | `String` | Returns UUID |
| `virtualContributor` | `String` | Returns UUID |
| `innovationHub` | `String` | Returns UUID |
| `innovationPack` | `String` | Returns UUID |
| `template` | `String` | Also requires `templatesSetID: UUID!` |

### Recommended flow

1. **You have a UUID** → use `lookup` directly:
   ```graphql
   query { lookup { space(ID: "uuid-here") { id nameID about { profile { displayName } } } } }
   ```

2. **You have a nameID (slug)** → use `lookupByName`:
   - For **spaces**: returns the full object directly:
     ```graphql
     query { lookupByName { space(NAMEID: "building-alkemio-org") { id nameID about { profile { displayName } } } } }
     ```
   - For **other entities**: returns a UUID, then use `lookup` for details:
     ```graphql
     # Step 1: resolve nameID → UUID
     query { lookupByName { organization(NAMEID: "alkemio") } }
     # Step 2: use UUID to fetch full object
     query { lookup { organization(ID: "returned-uuid") { id profile { displayName } } } }
     ```

3. **You have neither** → list and filter (last resort):
   ```graphql
   query { spaces { id nameID about { profile { displayName } } } }
   ```

## Common Queries

### Current user
```graphql
query { me { user { id nameID profile { displayName } } } }
```

### List spaces
```graphql
query { spaces { id nameID about { profile { displayName tagline } } } }
```

### Space by ID
```graphql
query SpaceById($id: UUID!) {
  lookup {
    space(ID: $id) {
      id
      nameID
      about { profile { displayName tagline } }
      community { id }
      collaboration { id }
    }
  }
}
```

### Space by nameID
```graphql
query SpaceByName($nameId: NameID!) {
  lookupByName {
    space(NAMEID: $nameId) {
      id
      nameID
      about { profile { displayName tagline } }
    }
  }
}
```

### Schema introspection (queries)
```graphql
query { __schema { queryType { fields { name description } } } }
```

### Schema introspection (mutations)
```graphql
query { __schema { mutationType { fields { name description } } } }
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| "No session token found" | Run `/non-interactive-login` first |
| "401 Unauthorized" or empty response | Token expired — re-run `/non-interactive-login` |
| "SESSION_TOKEN is not set" | Ensure the script reads the token file or `kratos_login` was called |
| GraphQL validation errors | Check query syntax; use introspection queries to discover the schema |
| "Kratos not reachable" | Run `pnpm run start:services` |
