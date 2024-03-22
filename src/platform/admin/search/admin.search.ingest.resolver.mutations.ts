import { reduce } from 'lodash';
import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import {
  AlkemioErrorStatus,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  AdminSearchIngestResult,
  IngestResult,
} from '@platform/admin/search/admin.search.ingest.result';
import { SearchIngestService } from '@services/api/search2/search.ingest/search.ingest.service';
import { BaseException } from '@common/exceptions/base.exception';

@Resolver()
export class AdminWhiteboardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private searchIngestService: SearchIngestService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => AdminSearchIngestResult, {
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
    const deleteResult = await this.searchIngestService.removeIndices();

    if (!deleteResult.acknowledged) {
      throw new BaseException(
        deleteResult.message ?? 'Failed to delete indices',
        LogContext.SEARCH_INGEST,
        AlkemioErrorStatus.UNSPECIFIED
      );
    }
    // small workaround until the return type is defined
    const result = await this.searchIngestService.ingest();
    const results = reduce(
      result,
      (acc, value, key) => {
        acc.push({ index: key, result: value });
        return acc;
      },
      [] as IngestResult[]
    );
    return {
      results,
    };
  }
}
