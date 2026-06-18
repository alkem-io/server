import { LogContext } from '@common/enums';
import {
  Controller,
  Get,
  HttpCode,
  Inject,
  LoggerService,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { InAppNotificationAdminService } from '@src/platform-admin/in-app-notification/in.app.notification.admin.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IngestTriggerResultDto } from './dto/ingest.trigger.result.dto';
import { PruneResultDto } from './dto/prune.result.dto';
import { TaskStatusDto } from './dto/task.status.dto';

/**
 * Internal admin jobs API — unauthenticated, in-cluster-only REST surface.
 *
 * Mounted under `/rest/internal/admin`. Internal **by construction**: no public
 * Traefik IngressRoute matches the `/rest/internal` prefix (the same mechanism
 * that protects `forward-auth` and `identity/resolve`). There is therefore
 * intentionally NO `@UseGuards` / authorization here — callers are reachable
 * only from inside the cluster via `alkemio-server-service:4000`.
 *
 * Each route invokes the SAME service method as its GraphQL counterpart so the
 * two surfaces cannot diverge (spec 006-internal-admin-jobs-api, FR-009). The
 * GraphQL mutations/queries under `src/platform-admin/` remain unchanged.
 */
@Controller('rest/internal/admin')
export class InternalAdminController {
  constructor(
    private readonly inAppNotificationAdminService: InAppNotificationAdminService,
    private readonly searchIngestService: SearchIngestService,
    private readonly taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  /**
   * Prune in-app notifications. Synchronous — responds when the prune completes.
   * GraphQL parity: `adminInAppNotificationsPrune`. No authz (FR-003); a thrown
   * error surfaces as 5xx (FR-008).
   */
  @Post('in-app-notifications/prune')
  async pruneInAppNotifications(): Promise<PruneResultDto> {
    return await this.inAppNotificationAdminService.pruneInAppNotifications();
  }

  /**
   * Trigger a from-scratch search ingest. Asynchronous — returns immediately
   * with the task id while the reindex runs in the background. GraphQL parity:
   * `adminSearchIngestFromScratch` (minus the authz block). The ingest is
   * fire-and-forget — deliberately NOT awaited so the response returns < 5s
   * (SC-004).
   */
  @Post('search-ingest')
  @HttpCode(202)
  async triggerSearchIngest(): Promise<IngestTriggerResultDto> {
    const task = await this.taskService.create();
    // start it asynchronously — do not await. ingestFromScratch records its own
    // failures via taskService.completeWithError, but guard the detached promise
    // so a rejection before/outside its internal try cannot become an
    // unhandled-rejection.
    this.searchIngestService.ingestFromScratch(task).catch(e => {
      this.logger.error?.(
        'Fire-and-forget search ingest rejected',
        e?.stack,
        LogContext.SEARCH_INGEST
      );
    });
    return { taskId: task.id };
  }

  /**
   * Read-only run-status projection for polling. GraphQL parity: `task(id:)` →
   * `TaskService.get(id)` (Redis cache, 3600s TTL). An unknown or TTL-expired id
   * is a 404 the caller MUST treat as a terminal failure (research R2).
   */
  @Get('tasks/:id')
  async getTaskStatus(@Param('id') id: string): Promise<TaskStatusDto> {
    const task = await this.taskService.get(id);

    if (!task) {
      throw new NotFoundException({
        message: 'Task not found',
        details: { taskId: id },
      });
    }

    return {
      id: task.id,
      status: task.status,
      itemsCount: task.itemsCount,
      itemsDone: task.itemsDone,
      errors: task.errors,
    };
  }
}
