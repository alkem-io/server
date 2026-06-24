# Data Model: MCP Server (foundation)

The foundation introduces **one** persisted entity. All other tools/resources
operate over existing platform entities (whiteboards, callouts, spaces,
contributions, activities, templates, audit entries) and add no schema.

## Entity: `McpApiKey`  (table `mcp_api_key`)

Extends `BaseAlkemioEntity` (`id` UUID PK, `createdDate`, `updatedDate`).

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `keyHash` | varchar(`SMALL_TEXT_LENGTH`) | NOT NULL | **Unique index.** SHA-256 hex of the plaintext key. Plaintext is never stored. |
| `name` | varchar(`SMALL_TEXT_LENGTH`) | NOT NULL | Human label for the key. |
| `description` | varchar(`MID_TEXT_LENGTH`) | nullable | Optional notes. |
| `userId` | uuid | NOT NULL | **Indexed.** The owning user; the key acts as this user. |
| `scopes` | jsonb | NOT NULL | Array of `McpApiKeyScope`. Service default when omitted: `[{ operations: ['read'] }]`. |
| `expiresAt` | timestamp | nullable | When set and in the past, the key is treated as invalid. |
| `lastUsedAt` | timestamp | nullable | Updated asynchronously on each successful auth. |
| `lastUsedFromIp` | varchar(`UUID_LENGTH`) | nullable | Client IP at last use (`x-forwarded-for` or socket address). |
| `isActive` | boolean | NOT NULL | Soft-revocation flag; revoke sets `false`. |

> Migration: creating `mcp_api_key` requires a database migration as part of the
> foundation (TypeORM). It is additive (new table, no change to existing tables).

## Value object: `McpApiKeyScope`

```
McpApiKeyScope {
  operations: ('read' | 'tools')[]   // 'read' = resource reads; 'tools' = tool calls
  spaceIds?: string[]                // OPTIONAL — declared but not yet enforced (fails closed; see 102)
}
```

## Key lifecycle (behavioral, not schema)

- **Generate**: `mcp_<base64url(randomBytes(32))>` (~43 random chars).
- **Store**: only `keyHash = sha256(plaintext)`; the plaintext is returned to the
  creator exactly once and is irrecoverable thereafter.
- **Validate**: look up by `keyHash` with `isActive: true`; reject if `expiresAt`
  is past; on success resolve to the owner's `ActorContext` and stamp last-used
  asynchronously.
- **Revoke**: ownership-checked (`{ id, userId }`); sets `isActive = false`
  (soft); not a hard delete.
- **List**: a user's own keys, newest first; never exposes plaintext (only hashes
  exist).

## Relationships

- `userId` → platform user (logical FK; the key grants an agent that user's
  permissions via `ActorContext`).
- No other relations; scopes are embedded JSON, not a join table.
