# How to Add a New Activity Type

Step-by-step guide for adding activity types to the Alkemio server. Activities track user actions and appear in activity feeds and logs.

**Example:** `CALLOUT_MEMO_CREATED` - tracks memo creation in callouts
**Reference Implementation:** See git history for this feature or compare with `CALLOUT_WHITEBOARD_CREATED`

---

## Implementation Checklist

## Implementation Checklist

### 1. Core Enum & Types

**File:** `src/common/enums/activity.event.type.ts`

- Add enum value: `CALLOUT_MEMO_CREATED = 'memo-created'`
- Convention: `{CONTEXT}_{ENTITY}_{ACTION}`, kebab-case value

**File:** `src/services/external/elasticsearch/types/contribution.type.ts`

- Add: `CALLOUT_MEMO_CREATED: 'CALLOUT_MEMO_CREATED'`

**File:** `src/services/external/elasticsearch/events/callout/callout.memo.created.ts`

- Create type extending `BaseContribution`

---

### 2. Activity Adapter (Event Creation)

**File:** `src/services/adapters/activity-adapter/dto/activity.dto.input.callout.memo.created.ts`

- Create DTO extending `ActivityInputBase`
- Include relevant entities (e.g., `memo`, `callout`)

**File:** `src/services/adapters/activity-adapter/activity.adapter.ts`

- Import entity and DTO
- Inject repository in constructor
- Add method: `async calloutMemoCreated(eventData)`
- Add helpers: `getCollaborationIdForMemo()`, `getMemoDisplayName()`

**File:** `src/services/adapters/activity-adapter/activity.adapter.module.ts`

- Import entity: `Memo`
- Add to `TypeOrmModule.forFeature([..., Memo])`

---

### 3. Contribution Reporter (Elasticsearch)

**File:** `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`

- Add method: `calloutMemoCreated(contribution, details)`
- Create document with type `CALLOUT_MEMO_CREATED`

---

### 4. Trigger Activity (Business Logic)

**File:** Where the action occurs (e.g., `callout.resolver.mutations.ts`)

- Import activity DTO
- Create processing method: `processActivityMemoCreated()`
- Call: `activityAdapter.calloutMemoCreated()`
- Call: `contributionReporter.calloutMemoCreated()`
- Trigger from mutation when appropriate (check visibility, conditions)

---

### 5. Activity Log API (GraphQL Exposure)

**File:** `src/services/api/activity-log/dto/activity.log.dto.entry.callout.memo.created.ts`

- Create `@ObjectType` implementing `IActivityLogEntry`
- Extend `IActivityLogEntryBase`
- Add `@Field()` decorators for GraphQL exposure

**File:** `src/services/api/activity-log/activity.log.builder.interface.ts`

- Import DTO
- Add method signature: `[ActivityEventType.CALLOUT_MEMO_CREATED]: ActivityLogBuilderFunction<...>`

**File:** `src/services/api/activity-log/activity.log.builder.service.ts`

- Import service (e.g., `MemoService`)
- Inject service in constructor
- Implement method: `async [ActivityEventType.CALLOUT_MEMO_CREATED](rawActivity)`

**File:** `src/services/api/activity-log/activity.log.service.ts`

- Import service
- Inject in constructor
- Pass to `ActivityLogBuilderService` constructor

**File:** `src/services/api/activity-log/activity.log.module.ts`

- Import module (e.g., `MemoModule`)
- Add to `imports` array

**File:** `src/services/api/activity-log/dto/activity.log.entry.interface.ts`

- Import DTO
- Add case in `resolveType()`: `case ActivityEventType.CALLOUT_MEMO_CREATED: return IActivityLogEntryCalloutMemoCreated`

---

### 6. Generate Schema

```bash
pnpm run schema:print
```

Verify in `schema.graphql`:

- Enum value in `ActivityEventType`
- New type `ActivityLogEntryCalloutMemoCreated`

---

## Key Patterns

### Activity Creation

- **resourceID**: Primary entity ID (e.g., `memo.id`)
- **parentID**: Container entity ID (e.g., `callout.id`)
- **collaborationID**: Space collaboration context
- **description**: `[${displayName}]` format
- **visibility**: `true` for user-visible activities

### File Naming

- Activity input: `activity.dto.input.{context}.{entity}.{action}.ts`
- Activity log entry: `activity.log.dto.entry.{context}.{entity}.{action}.ts`
- Elasticsearch event: `{context}.{entity}.{action}.ts`

---

## Testing Checklist

- [ ] Activity created on trigger action
- [ ] Appears in `activityLog` query
- [ ] Appears in `activityFeed` query
- [ ] Appears in `activityFeedGrouped` query
- [ ] GraphQL schema includes enum and type
- [ ] No compilation errors
- [ ] Elasticsearch document created

---

## Troubleshooting

**"Nest can't resolve dependencies"**
→ Add entity to `TypeOrmModule.forFeature([...])` or module to `imports`

**"Unable to determine activity log entry type"**
→ Add case to `resolveType()` in `activity.log.entry.interface.ts`

**Type not in GraphQL schema**
→ Run `pnpm run schema:print`

**Activities not in feed**
→ Check `visibility: true`, user authorization, activity actually created

---

## File Reference Map

```
Core
├── src/common/enums/activity.event.type.ts (enum)
├── src/platform/activity/activity.service.ts (persistence)

Adapters
├── src/services/adapters/activity-adapter/
│   ├── dto/activity.dto.input.*.ts (input DTOs)
│   ├── activity.adapter.ts (creation logic)
│   └── activity.adapter.module.ts (DI config)

API
├── src/services/api/activity-log/
│   ├── dto/activity.log.dto.entry.*.ts (GraphQL types)
│   ├── dto/activity.log.entry.interface.ts (union resolver)
│   ├── activity.log.builder.interface.ts (type map)
│   ├── activity.log.builder.service.ts (conversion logic)
│   ├── activity.log.service.ts (query service)
│   └── activity.log.module.ts (DI config)

Elasticsearch
├── src/services/external/elasticsearch/
│   ├── types/contribution.type.ts (constants)
│   ├── events/callout/*.ts (event types)
│   └── contribution-reporter/contribution.reporter.service.ts (reporting)

Triggers
└── src/domain/.../resolver.mutations.ts (business logic)
```

---

**Last Updated:** 2025-11-10
**Example Implementation:** CALLOUT_MEMO_CREATED
