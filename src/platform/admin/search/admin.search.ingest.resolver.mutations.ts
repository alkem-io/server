import { reduce } from 'lodash';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import {
  AlkemioErrorStatus,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  AdminSearchIngestResult,
  IngestResult,
} from '@platform/admin/search/admin.search.ingest.result';
import { SearchIngestService } from '@services/api/search/v2/ingest/search.ingest.service';
import { BaseException } from '@common/exceptions/base.exception';
import { TaskService } from '@services/task';
import { Task } from '@services/task/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class AdminSearchIngestResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService,
    private taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  // @Mutation(() => AdminSearchIngestResult, {
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

    this.searchIngestService
      .removeIndices()
      .then(() => this.searchIngestService.ensureIndicesExist())
      .then(() => this.searchIngestService.removeIndices())
      .then(() => this.searchIngestService.ingest());
    // const deleteResult = await this.searchIngestService.removeIndices();
    //
    // if (!deleteResult.acknowledged) {
    //   throw new BaseException(
    //     deleteResult.message ?? 'Failed to delete indices',
    //     LogContext.SEARCH_INGEST,
    //     AlkemioErrorStatus.UNSPECIFIED
    //   );
    // }

    // const createResults = await this.searchIngestService.ensureIndicesExist();
    //
    // if (!createResults.acknowledged) {
    //   throw new BaseException(
    //     createResults.message ?? 'Failed to create indices',
    //     LogContext.SEARCH_INGEST,
    //     AlkemioErrorStatus.UNSPECIFIED
    //   );
    // }

    // small workaround until the return type is defined
    // const result = await this.searchIngestService.ingest();
    // const results = reduce(
    //   result,
    //   (acc, { total, batches }, key) => {
    //     acc.push({ index: key, total, batches });
    //     return acc;
    //   },
    //   [] as IngestResult[]
    // );
    // return {
    //   results,
    // };
    return 'started';
  }
}
