/**
 * Result of triggering a from-scratch search ingest.
 *
 * `taskId` is the id of the async run; the caller polls
 * `GET /rest/internal/admin/tasks/:id` with it to a terminal state.
 * See spec 006-internal-admin-jobs-api.
 */
export class IngestTriggerResultDto {
  taskId!: string;
}
