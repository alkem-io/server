import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CommunityRoleSetLoaderCreator } from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IRoleSet } from '@domain/access/role-set';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { Community, ICommunity } from '@domain/community/community';
import { IUserGroup } from '@domain/community/user-group';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege, Profiling } from '@src/common/decorators';
import { CommunityService } from './community.service';
@Resolver(() => ICommunity)
export class CommunityResolverFields {
  constructor(private communityService: CommunityService) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'Groups of users related to a Community.',
  })
  @Profiling.api
  async groups(@Parent() community: Community) {
    return await this.communityService.getUserGroups(community);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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
  @ResolveField('roleSet', () => IRoleSet, {
    nullable: false,
    description: 'The RoleSet for this Community.',
  })
  async roleSet(
    @Parent() community: Community,
    @Loader(CommunityRoleSetLoaderCreator, { parentClassRef: Community })
    loader: ILoader<IRoleSet>
  ): Promise<IRoleSet> {
    return loader.load(community.id);
  }
}
