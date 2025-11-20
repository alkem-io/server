# Quickstart: Notification Email Blacklist

This guide demonstrates how to use the notification email blacklist feature to block specific email addresses from receiving platform notifications.

## Prerequisites

- Platform admin credentials
- GraphQL client access (GraphiQL or similar)

## Setup

1. **Bootstrap services**

   ```bash
   pnpm install
   pnpm run start:services
   pnpm start:dev
   ```

2. **Authenticate as platform admin**
   - Access `/graphiql` endpoint (typically at `http://localhost:3000/graphiql`)
   - Authenticate using platform administrator credentials
   - Ensure you have valid session cookies/token

## Usage Examples

### Add an Email to the Blacklist

```graphql
mutation AddBlacklist {
  addNotificationEmailToBlacklist(input: { email: "blocked@example.com" })
}
```

**Expected Result:**

```json
{
  "data": {
    "addNotificationEmailToBlacklist": ["blocked@example.com"]
  }
}
```

**Notes:**

- Email is automatically converted to lowercase for storage
- Duplicate attempts return a validation error
- Wildcard characters (`*`, `?`) are rejected
- Maximum 250 entries can be added

### Add Multiple Emails

```graphql
mutation AddFirstEmail {
  addNotificationEmailToBlacklist(input: { email: "test1@example.com" })
}

mutation AddSecondEmail {
  addNotificationEmailToBlacklist(input: { email: "test2@example.com" })
}
```

### Query Current Blacklist

```graphql
query GetBlacklist {
  platform {
    settings {
      integration {
        notificationEmailBlacklist
        iframeAllowedUrls
      }
    }
  }
}
```

**Expected Result:**

```json
{
  "data": {
    "platform": {
      "settings": {
        "integration": {
          "notificationEmailBlacklist": [
            "blocked@example.com",
            "test1@example.com",
            "test2@example.com"
          ],
          "iframeAllowedUrls": [...]
        }
      }
    }
  }
}
```

### Remove an Email from the Blacklist

```graphql
mutation RemoveBlacklist {
  removeNotificationEmailFromBlacklist(input: { email: "test1@example.com" })
}
```

**Expected Result:**

```json
{
  "data": {
    "removeNotificationEmailFromBlacklist": [
      "blocked@example.com",
      "test2@example.com"
    ]
  }
}
```

**Notes:**

- Email lookup is case-insensitive
- Returns error if email not found in blacklist
- Returns updated array after removal

## Error Scenarios

### Duplicate Email

```graphql
mutation {
  addNotificationEmailToBlacklist(input: { email: "duplicate@example.com" })
}
# Run again:
# Error: "Email duplicate@example.com is already in the blacklist"
```

### Wildcard Characters

```graphql
mutation {
  addNotificationEmailToBlacklist(input: { email: "*@example.com" })
}
# Error: "Wildcard characters are not allowed in email addresses"
```

### Removing Non-existent Email

```graphql
mutation {
  removeNotificationEmailFromBlacklist(input: { email: "notfound@example.com" })
}
# Error: "Email notfound@example.com not found in blacklist"
```

### Capacity Limit

```graphql
# After adding 250 entries:
mutation {
  addNotificationEmailToBlacklist(input: { email: "overflow@example.com" })
}
# Error: "Blacklist limit of 250 entries reached. Remove entries before adding new ones."
```

## Testing with Variables

GraphiQL supports query variables for easier testing:

```graphql
mutation AddBlacklist($email: String!) {
  addNotificationEmailToBlacklist(input: { email: $email })
}

# Variables:
# {
#   "email": "variable@example.com"
# }
```

## Cleanup

After testing, remove all test entries:

```graphql
mutation RemoveTest1 {
  removeNotificationEmailFromBlacklist(input: { email: "blocked@example.com" })
}

mutation RemoveTest2 {
  removeNotificationEmailFromBlacklist(input: { email: "test2@example.com" })
}
```

Stop services:

```bash
docker compose -f quickstart-services.yml down
```

## Integration Notes

- **Downstream Services**: The blacklist is configuration-only. Downstream notification services must fetch and apply the blacklist themselves.
- **Sync Timing**: Changes are immediate at the platform level but may take time to propagate to notification services based on their sync schedule.
- **Authorization**: Only platform administrators can modify the blacklist. All authenticated users can query it.
- **Persistence**: Changes persist across service restarts as they're stored in the platform settings JSON column.
