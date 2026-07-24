import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { TaskStatus } from '@domain/task/dto';
import { Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';

@InstrumentResolver()
@Resolver()
export class AdminSearchIngestResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService,
    private taskService: TaskService,
    private platformOperationsAuditService: PlatformOperationsAuditService
  ) {}

  @Mutation(() => String, {
    description:
      'Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation.',
  })
  async adminSearchIngestFromScratch(
    @CurrentActor() actorContext: ActorContext
  ) {
    const task = await this.taskService.create();

    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    try {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
        `Ingest new data into Elasticsearch from scratch`
      );
    } catch (e: any) {
      await this.taskService.updateTaskErrors(task.id, e?.message);
      await this.taskService.complete(task.id, TaskStatus.ERRORED);
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminSearchIngestFromScratch',
        outcome: 'failure',
        target: { taskID: task.id },
        error: e,
      });

      throw e;
    }
    // start it asynchronously — intentional fire-and-forget
    void this.searchIngestService.ingestFromScratch(task);
    await this.platformOperationsAuditService.recordOperation({
      actorID: actorContext.actorID,
      action: 'adminSearchIngestFromScratch',
      outcome: 'success',
      target: { taskID: task.id },
    });
    // return the task in the meantime
    return task.id;
  }
}
