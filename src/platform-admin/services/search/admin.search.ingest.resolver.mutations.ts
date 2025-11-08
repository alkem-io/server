import { Inject, LoggerService } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TaskStatus } from '@domain/task/dto';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class AdminSearchIngestResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService,
    private taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @Mutation(() => String, {
    description:
      'Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation.',
  })
  async adminSearchIngestFromScratch(@CurrentUser() agentInfo: AgentInfo) {
    const task = await this.taskService.create();

    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    try {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        `Ingest new data into Elasticsearch from scratch: ${agentInfo.email}`
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
