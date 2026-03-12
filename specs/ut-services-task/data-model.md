# Data Model: Unit Tests for src/services/task

## No Data Model Changes
This is a test-only spec. No entities, migrations, or schema changes are involved.

## Relevant Interfaces (read-only reference)

### Task Interface
```typescript
interface Task {
  readonly id: string;
  readonly created: number;
  readonly start: number;
  end?: number;
  type?: string;
  status: TaskStatus;
  readonly action?: 'auth-reset' | string;
  readonly results: Array<TaskResult>;
  readonly errors: Array<TaskError>;
  readonly itemsCount?: number;
  itemsDone?: number;
}
```

### TaskStatus Enum
- `IN_PROGRESS = 'in-progress'`
- `COMPLETED = 'completed'`
- `ERRORED = 'errored'`

### Cache Keys
- Individual tasks: stored by UUID (`task.id`)
- Task list: stored under `TASK_LIST_CACHE_KEY = 'task-list'`
