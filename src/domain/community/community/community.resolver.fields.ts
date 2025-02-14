import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver, Args } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { Community, ICommunity } from '@domain/community/community';
import { CommunityService } from './community.service';
import { IUserGroup } from '@domain/community/user-group';
import { AuthorizationPrivilege } from '@common/enums';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IRoleSet } from '@domain/access/role-set';
@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(private communityService: CommunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description: 'The user group with the specified id anywhere in the space',
  })
  async group(
    @Parent() community: ICommunity,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.communityService.getUserGroup(community, groupID);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('communication', () => ICommunication, {
    nullable: false,
    description: 'The Communications for this Community.',
  })
  @Profiling.api
  async communication(@Parent() community: Community) {
    return await this.communityService.getCommunication(community.id, {
      communication: { updates: true },
    });
  }

  // Note: do not check for READ so that it is accessible to check for authorization
  @UseGuards(GraphqlGuard)
  @ResolveField('roleSet', () => IRoleSet, {
    nullable: false,
    description: 'The RoleSet for this Community.',
  })
  async roleSet(@Parent() community: Community): Promise<IRoleSet> {
    return this.communityService.getRoleSet(community);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('guidelines', () => ICommunityGuidelines, {
    nullable: false,
    description: 'The guidelines for members of this Community.',
  })
  async guidelines(
    @Parent() community: ICommunity
  ): Promise<ICommunityGuidelines> {
    return await this.communityService.getCommunityGuidelines(community);
  }
}
