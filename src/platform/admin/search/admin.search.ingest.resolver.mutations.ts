import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { SearchIngestService } from '@services/api/search/v2/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TaskStatus } from '@domain/task/dto';
import { LicenseManagerService } from '@core/license-manager';
import { randomUUID } from 'crypto';
import { ChatGuidanceAnswerRelevanceInput } from '@services/api/chat-guidance/dto/chat.guidance.relevance.dto';

@Resolver()
export class AdminSearchIngestResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService,
    private taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private licenseManagerService: LicenseManagerService
  ) {}
  // todo: remove
  @UseGuards(GraphqlGuard)
  @Mutation(() => String)
  public async adminCreateLicenseCostumer() {
    const res = await this.licenseManagerService.createCostumer({
      name: `Test User ${randomUUID()}`,
      emails: {
        main: `main${randomUUID()}@alkem.io`,
        secondary: `secondary${randomUUID()}@alkem.io`,
      },
      tax_details: {
        vat_id: 'vat_id',
      },
      notes: 'notes',
      customer_reference: `your-internal-user-id-${randomUUID()}`,
      contracts: [],
    });
    return res.id;
  }

  // todo: remove
  @UseGuards(GraphqlGuard)
  @Mutation(() => String)
  public async adminGetCostumerEntitlements(
    @Args('costumerID') costumerId: string
  ) {
    const result = await this.licenseManagerService.getEntitlements(costumerId);
    return JSON.stringify(result, null, 2);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description:
      'Ingests new data into Elasticsearch from scratch. This will delete all existing data and ingest new data from the source. This is an admin only operation.',
  })
  @Profiling.api
  async adminSearchIngestFromScratch(@CurrentUser() agentInfo: AgentInfo) {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `Ingest new data into Elasticsearch from scratch: ${agentInfo.email}`
    );

    this.logger.verbose?.('Starting search ingest from scratch');

    const task = await this.taskService.create();

    this.searchIngestService
      .removeIndices()
      .then(res => {
        if (!res.acknowledged) {
          throw new Error(
            res.message ? res.message : 'Failed to delete indices'
          );
        }
        this.taskService.updateTaskResults(task.id, 'Indices removed');
        return this.searchIngestService.ensureIndicesExist();
      })
      .then(res => {
        if (!res.acknowledged) {
          throw new Error(
            res.message ? res.message : 'Failed to create indices'
          );
        }
        this.taskService.updateTaskResults(task.id, 'Indices recreated');
        return this.searchIngestService.ingest(task);
      })
      .then(() => {
        this.taskService.complete(task.id);
        this.logger.verbose?.(
          'Search ingest from scratch completed',
          LogContext.SEARCH_INGEST
        );
      })
      .catch(async e => {
        await this.taskService.updateTaskErrors(task.id, e?.message);
        this.logger.error?.(
          `Search ingest from scratch completed with error: ${e?.message}`,
          e?.stack,
          LogContext.SEARCH_INGEST
        );
        return this.taskService.complete(task.id, TaskStatus.ERRORED);
      });

    return task.id;
  }
}
