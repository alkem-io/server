import { Inject, LoggerService } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TaskStatus } from '@domain/task/dto';
import { InstrumentResolver } from '@src/apm/decorators';
import { Task } from '@services/task/task.interface';

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
  /**
   * TODO
   * create new indices with new names
   * ingest into new indices
   * does the aliases exist?
   * - no - fresh new setup -> assign alias to index
   * - yes - we have old indices -> assign alias to index
   * did we have aliases?
   *  - no -> do nothing
   *  - yes -> delete index
   */
  async adminSearchIngestFromScratchV2(@CurrentUser() agentInfo: AgentInfo) {
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
    this.ingestAsync(task);
    // return the task in the meantime
    return task.id;
  }

  private async ingestAsync(task: Task) {
    this.logger.verbose?.('Starting search ingest from scratch');
    // create new indices with suffix
    await this.taskService.updateTaskResults(task.id, 'Creating indices');

    const suffix = Date.now().toString(36);
    const creationResult =
      await this.searchIngestService.ensureIndicesExist(suffix);

    if (!creationResult.acknowledged) {
      await this.taskService.updateTaskErrors(
        task.id,
        `Failed to create indices: ${creationResult.message}`
      );
      await this.taskService.complete(task.id, TaskStatus.ERRORED);
      return;
    }

    await this.taskService.updateTaskResults(task.id, 'Indices created');
    // ingest data into the new indices
    try {
      await this.searchIngestService.ingest(task, suffix);
    } catch (e: any) {
      await this.taskService.updateTaskErrors(task.id, e?.message);
      await this.taskService.complete(task.id, TaskStatus.ERRORED);
      this.logger.error?.(
        `Search ingest from scratch completed with error: ${e?.message}`,
        e?.stack,
        LogContext.SEARCH_INGEST
      );
      return;
    }
    // aliases
    const aliasData = await this.searchIngestService.getActiveAliases();

    const aliasesExist = aliasData.length > 0;
    await this.taskService.updateTaskResults(
      task.id,
      aliasesExist ? 'Active aliases found' : 'No active aliases found'
    );
    if (aliasesExist) {
      await this.taskService.updateTaskResults(task.id, 'Removing old aliases');
    }
    await this.taskService.updateTaskResults(
      task.id,
      'Assigning aliases to new indices'
    );

    if (aliasesExist) {
      await this.searchIngestService.assignAliasToIndex(
        aliasData,
        aliasesExist
      );
    } else {
      const aliases = this.searchIngestService.getAliases();
      const data = aliases.map(alias => ({
        alias,
        index: `${alias}-${suffix}`,
      }));

      await this.searchIngestService.assignAliasToIndex(data, aliasesExist);
    }
    // delete old indices, if aliases existed
    if (aliasesExist) {
      await this.taskService.updateTaskResults(task.id, 'Removing old indices');
      const removalResult =
        await this.searchIngestService.removeIndices(suffix);
      if (!removalResult.acknowledged) {
        await this.taskService.updateTaskErrors(
          task.id,
          `Failed to delete old indices: ${removalResult.message}`
        );
        await this.taskService.complete(task.id, TaskStatus.ERRORED);
        return;
      }
    }
    await this.taskService.complete(task.id);
    this.logger.verbose?.(
      'Search ingest from scratch completed',
      LogContext.SEARCH_INGEST
    );
  }

  // @Mutation(() => String, {
  //   description:
  //     'Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation.',
  // })
  // async adminSearchIngestFromScratch(@CurrentUser() agentInfo: AgentInfo) {
  //   const platformPolicy =
  //     await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
  //   this.authorizationService.grantAccessOrFail(
  //     agentInfo,
  //     platformPolicy,
  //     AuthorizationPrivilege.PLATFORM_ADMIN,
  //     `Ingest new data into Elasticsearch from scratch: ${agentInfo.email}`
  //   );
  //
  //   this.logger.verbose?.('Starting search ingest from scratch');
  //
  //   const task = await this.taskService.create();
  //
  //   this.searchIngestService
  //     .removeIndices()
  //     .then(res => {
  //       if (!res.acknowledged) {
  //         throw new Error(
  //           res.message ? res.message : 'Failed to delete indices'
  //         );
  //       }
  //       this.taskService.updateTaskResults(task.id, 'Indices removed');
  //       return this.searchIngestService.ensureIndicesExist();
  //     })
  //     .then(res => {
  //       if (!res.acknowledged) {
  //         throw new Error(
  //           res.message ? res.message : 'Failed to create indices'
  //         );
  //       }
  //       this.taskService.updateTaskResults(task.id, 'Indices recreated');
  //       return this.searchIngestService.ingest(task);
  //     })
  //     .then(() => {
  //       this.taskService.complete(task.id);
  //       this.logger.verbose?.(
  //         'Search ingest from scratch completed',
  //         LogContext.SEARCH_INGEST
  //       );
  //     })
  //     .catch(async e => {
  //       await this.taskService.updateTaskErrors(task.id, e?.message);
  //       this.logger.error?.(
  //         `Search ingest from scratch completed with error: ${e?.message}`,
  //         e?.stack,
  //         LogContext.SEARCH_INGEST
  //       );
  //       return this.taskService.complete(task.id, TaskStatus.ERRORED);
  //     });
  //
  //   return task.id;
  // }
}
