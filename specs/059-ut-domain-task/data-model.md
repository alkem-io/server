# Data Model: src/domain/task

**Date**: 2026-03-12

## Overview

The task domain has no persistent data model (no TypeORM entities). Tasks are ephemeral objects stored in the cache manager (in-memory/Redis).

## Key Types

### ITask (GraphQL ObjectType)
```
ITask {
  id: string (UUID)
  created: number (timestamp)
  start: number (timestamp)
  end?: number (timestamp)
  itemsCount?: number
  itemsDone?: number
  type?: string
  status?: TaskStatus
  results?: TaskResult[]
  errors?: TaskError[]
}
```

### TaskStatus (Enum)
```
IN_PROGRESS = 'in-progress'
COMPLETED = 'completed'
ERRORED = 'errored'
```

## Computed Fields

- `progress`: Derived from `itemsDone / itemsCount`, returned as number rounded to 2 decimal places. Returns `undefined` when `itemsCount` is null/undefined.

## Storage

Tasks are stored in `cache-manager` with a TTL of 3600 seconds. A task list is maintained under the `TASK_LIST_CACHE_KEY` key.

## No Migration Required

This is a test-only change with no schema or data model modifications.
