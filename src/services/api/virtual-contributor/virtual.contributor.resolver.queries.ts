import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { VirtualContributorInput } from './dto/virtual.contributor.dto.input';
import { VirtualContributorService } from './virtual.contributor.service';
import { IVirtualContributorQueryResult } from './dto/virtual.contributor.query.result.dto';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
@Resolver()
export class VirtualContributorResolverQueries {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IVirtualContributorQueryResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askVirtualContributorQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: VirtualContributorInput
  ): Promise<IVirtualContributorQueryResult> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE,
      `Access interactive guidance: ${agentInfo.email}`
    );

    return this.virtualContributorService.askQuestion(chatData, agentInfo);
  }
}
