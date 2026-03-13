# Plan: Unit Tests for src/services/adapters

## Approach
Use NestJS Test module with `defaultMockerFactory` for auto-mocking dependencies. Write focused tests that verify:
1. Correct delegation to injected services
2. Error handling paths (try/catch, early returns)
3. Conditional logic (filtering recipients, enabled/disabled checks)
4. Data transformation (payload mapping)

## Test Strategy by File

### Tier 1: High-value (complex logic, branching)
- **notification.space.adapter.ts** - Complex recipient filtering, try/catch for EntityNotFoundException
- **notification.external.adapter.ts** - Payload building with contributor/user resolution, contribution type branching
- **notification.in.app.adapter.ts** - Unsupported event filtering, empty receiver check, counter updates
- **local.storage.adapter.ts** - Enabled/disabled guard, file operations, error wrapping
- **activity.adapter.ts** - DB lookups with EntityNotFoundException, event logging

### Tier 2: Medium-value (delegation + some logic)
- **notification.organization.adapter.ts** - Recipient routing, in-app + external dispatch
- **notification.platform.adapter.ts** - Multiple event types, commenter filtering
- **notification.user.adapter.ts** - Sender filtering, mention payload building
- **communication.adapter.event.service.ts** - Event translation, Nack on error

### Tier 3: Lower-value (thin delegation)
- **ai.server.adapter.ts** - Mostly pass-through to AiServerService
- **notification.adapter.ts** - Single method delegation
- **notification.virtual.contributor.adapter.ts** - Single method delegation

## Implementation Order
1. Create Tier 1 tests first for maximum coverage impact
2. Add Tier 2 tests
3. Add Tier 3 tests if needed for >=80% coverage
