import { TaskStatus } from '@domain/task/dto';

/**
 * Read-only projection of the existing `ITask` for the run-status endpoint.
 *
 * Source: `TaskService.get(id)` (Redis cache, 3600s TTL). An unknown/expired id
 * surfaces as a 404 at the controller — never projected here. See spec
 * 006-internal-admin-jobs-api (research R2) for the polling contract.
 */
export class TaskStatusDto {
  id!: string;
  status!: TaskStatus;
  itemsCount?: number;
  itemsDone?: number;
  errors?: unknown[];
}
