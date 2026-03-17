# Tasks: Unit Tests for src/services/task

## Tasks

- [x] T1: Analyze source files and identify testable methods
- [x] T2: Create SDD spec artifacts
- [ ] T3: Implement comprehensive tests for TaskService
  - [ ] T3.1: getTaskList() - cached list found
  - [ ] T3.2: getTaskList() - list not found, creates new
  - [ ] T3.3: getAll() - returns filtered tasks by status
  - [ ] T3.4: getAll() - handles empty task list
  - [ ] T3.5: get() - delegates to cache
  - [ ] T3.6: getOrFail() - returns task when found
  - [ ] T3.7: getOrFail() - throws when not found
  - [ ] T3.8: create() - creates task with itemsCount
  - [ ] T3.9: create() - creates task without itemsCount
  - [ ] T3.10: updateTaskResults() - adds result, increments itemsDone
  - [ ] T3.11: updateTaskResults() - completes task when all items done
  - [ ] T3.12: updateTaskResults() - respects completeItem=false
  - [ ] T3.13: updateTaskErrors() - adds error, increments itemsDone
  - [ ] T3.14: updateTaskErrors() - completes task when all items done
  - [ ] T3.15: complete() - sets status and end timestamp
  - [ ] T3.16: completeWithError() - sets error, status, end timestamp
  - [ ] T3.17: addTaskToList (private) - error path when list is null
  - [ ] T3.18: addTaskToList (private) - error path when set fails
- [ ] T4: Verify >= 80% coverage
- [ ] T5: Verify lint and type check pass
- [ ] T6: Commit changes
