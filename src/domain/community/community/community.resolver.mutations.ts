import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CreateUserGroupInput } from '../user-group/dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AgentBeginVerifiedCredentialOfferOutput } from '@domain/agent/agent/dto/agent.dto.verified.credential.offer.begin.output';
import { AlkemioUserClaim } from '@services/external/trust-registry/trust.registry.claim/claim.alkemio.user';
import { CommunityMemberClaim } from '@services/external/trust-registry/trust.registry.claim/claim.community.member';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class CommunityResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communityService: CommunityService,
    private agentService: AgentService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group in the specified Community.',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const community = await this.communityService.getCommunityOrFail(
      groupData.parentID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.CREATE,
      `create group community: ${community.id}`
    );
    const group = await this.communityService.createGroup(groupData);
    const authorizations =
      await this.userGroupAuthorizationService.applyAuthorizationPolicy(
        group,
        community.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return group;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => AgentBeginVerifiedCredentialOfferOutput, {
    description: 'Generate community member credential offer',
  })
  async beginCommunityMemberVerifiedCredentialOfferInteraction(
    @Args({ name: 'communityID', type: () => String }) communityID: string,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<AgentBeginVerifiedCredentialOfferOutput> {
    const community =
      await this.communityService.getCommunityOrFail(communityID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.READ,
      `beginCommunityMemberCredentialOfferInteraction: ${community.id}`
    );

    return await this.agentService.beginCredentialOfferInteraction(
      agentInfo.agentID,
      [
        {
          type: 'CommunityMemberCredential',
          claims: [
            new AlkemioUserClaim({
              userID: agentInfo.userID,
              email: agentInfo.email,
            }),
            new CommunityMemberClaim({
              communityID: community.id,
              communityDisplayName: community.id,
            }),
          ],
        },
      ]
    );
  }
}
