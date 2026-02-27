import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  LeadOrganizationsByRoleSetLoaderCreator,
  LeadUsersByRoleSetLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { RoleSetMembershipStatusDataLoader } from '@domain/access/role-set/role.set.data.loader.membership.status';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IForm } from '@domain/common/form/form.interface';
import { UUID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization';
import { IUser } from '@domain/community/user/user.interface';
import { Inject } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { SpaceAboutMembership } from './dto/space.about.membership';

@Resolver(() => SpaceAboutMembership)
export class SpaceAboutMembershipResolverFields {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(RoleSetMembershipStatusDataLoader)
    private readonly membershipStatusLoader: RoleSetMembershipStatusDataLoader
  ) {}

  @ResolveField('myPrivileges', () => [AuthorizationPrivilege], {
    nullable: true,
    description:
      'The privileges granted to the current user based on the Space membership policy.',
  })
  myPrivileges(
    @CurrentActor() actorContext: ActorContext,
    @Parent() membership: SpaceAboutMembership
  ): AuthorizationPrivilege[] {
    const authorization = membership.roleSet.authorization;

    return this.authorizationPolicyService.getAgentPrivileges(
      actorContext,
      this.authorizationPolicyService.validateAuthorization(authorization)
    );
  }

  @ResolveField('roleSetID', () => UUID, {
    nullable: false,
    description: 'The identifier of the RoleSet within the Space.',
  })
  roleSetID(@Parent() membership: SpaceAboutMembership): string {
    return membership.roleSet.id;
  }

  @ResolveField('communityID', () => UUID, {
    nullable: false,
    description: 'The identifier of the Community within the Space.',
  })
  communityID(@Parent() membership: SpaceAboutMembership): string {
    return membership.community.id;
  }

  @ResolveField('applicationForm', () => IForm, {
    nullable: false,
    description: 'The Form used for Applications to this Space.',
  })
  async applicationForm(
    @Parent() membership: SpaceAboutMembership
  ): Promise<IForm> {
    const roleSet = membership.roleSet;
    return await this.roleSetService.getApplicationForm(roleSet);
  }

  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentActor() actorContext: ActorContext,
    @Parent() membership: SpaceAboutMembership
  ): Promise<CommunityMembershipStatus> {
    const roleSet = membership.roleSet;
    // Uses the DataLoader to batch load membership statuses
    return this.membershipStatusLoader.loader.load({ actorContext, roleSet });
  }

  @ResolveField('leadUsers', () => [IUser], {
    nullable: false,
    description: 'The Lead Users that are associated with this Space.',
  })
  public async leadUsers(
    @Parent() membership: SpaceAboutMembership,
    @Loader(LeadUsersByRoleSetLoaderCreator) loader: ILoader<IUser[]>
  ): Promise<IUser[]> {
    const credential = membership.roleSet.roles?.find(
      r => r.name === RoleName.LEAD
    )?.credential;
    if (!credential) {
      return [];
    }
    return loader.load(`${credential.type}|${credential.resourceID}`);
  }

  @ResolveField('leadOrganizations', () => [IOrganization], {
    nullable: false,
    description: 'The Lead Organizations that are associated with this Space.',
  })
  public async leadOrganizations(
    @Parent() membership: SpaceAboutMembership,
    @Loader(LeadOrganizationsByRoleSetLoaderCreator)
    loader: ILoader<IOrganization[]>
  ): Promise<IOrganization[]> {
    const credential = membership.roleSet.roles?.find(
      r => r.name === RoleName.LEAD
    )?.credential;
    if (!credential) {
      return [];
    }
    return loader.load(`${credential.type}|${credential.resourceID}`);
  }
}
