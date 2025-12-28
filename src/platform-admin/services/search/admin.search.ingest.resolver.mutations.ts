import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { TaskStatus } from '@domain/task/dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminSearchIngestResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService,
    private taskService: TaskService
  ) {}

  @Mutation(() => String, {
    description:
      'Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation.',
  })
  async adminSearchIngestFromScratch(
    @CurrentUser() actorContext: ActorContext
  ) {
    const task = await this.taskService.create();

    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    try {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        `Ingest new data into Elasticsearch from scratch: ${actorContext.actorId}`
      );
    } catch (e: any) {
      await this.taskService.updateTaskErrors(task.id, e?.message);
      await this.taskService.complete(task.id, TaskStatus.ERRORED);

      throw e;
    }
    // start it asynchronously
    this.searchIngestService.ingestFromScratch(task);
    // return the task in the meantime
    return task.id;
  }
}
