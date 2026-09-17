// The columns a Tasks board starts with when no explicit column list is
// supplied at creation. The first entry is the default column: every task
// created without an explicit column lands here, and it is the column a task
// reflows to when its own column is deleted. It can never itself be deleted.
export const TASK_BOARD_DEFAULT_COLUMNS: readonly string[] = [
  'To Do',
  'In Progress',
  'Done',
];

// The reserved tagset name that marks a POSTS callout as a Tasks board and,
// on a contribution, carries that task's column. Mirrors the value of
// TagsetReservedName.TASK; kept here so the task-board layer does not have to
// reach into the enum for the common membership check.
export const TASK_BOARD_TAGSET_NAME = 'task';

// The maximum number of columns a Tasks board may hold. The board's per-column
// task counts are returned in full on every board query, so an unbounded column
// list would let a caller inflate that response without limit. This cap is the
// authoritative board-width limit, enforced by the domain services on both the
// initial-column and add-column paths; the DTOs mirror it as a fast-fail.
export const MAX_TASK_BOARD_COLUMNS = 20;
