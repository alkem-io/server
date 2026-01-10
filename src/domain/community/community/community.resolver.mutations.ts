import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CreateUserGroupInput } from '../user-group/dto';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class CommunityResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communityService: CommunityService
  ) {}

  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group in the specified Community.',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @CurrentActor() actorContext: ActorContext,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const community = await this.communityService.getCommunityOrFail(
      groupData.parentID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
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
}
