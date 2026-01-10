import { Inject } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { RoleSetService } from './role.set.service';
import { IForm } from '@domain/common/form/form.interface';
import { IRoleSet } from './role.set.interface';
import { RoleSet } from './role.set.entity';
import { RoleName } from '@common/enums/role.name';
import { IRole } from '../role/role.interface';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { ActorContext } from '@core/actor-context';
import { RoleSetRoleImplicit } from '@common/enums/role.set.role.implicit';
import { RoleSetActorRolesDataLoader } from './role.set.data.loaders.actor.roles';
import { RoleSetMembershipStatusDataLoader } from './role.set.data.loader.membership.status';
import { InstrumentResolver } from '@src/apm/decorators';

// Resolver for fields on RoleSet that are available without READ access
@InstrumentResolver()
@Resolver(() => IRoleSet)
export class RoleSetResolverFieldsPublic {
  constructor(
    private roleSetService: RoleSetService,
    @Inject(RoleSetActorRolesDataLoader)
    private readonly actorRolesLoader: RoleSetActorRolesDataLoader,
    @Inject(RoleSetMembershipStatusDataLoader)
    private readonly membershipStatusLoader: RoleSetMembershipStatusDataLoader
  ) {}

  @ResolveField('applicationForm', () => IForm, {
    nullable: false,
    description: 'The Form used for Applications to this roleSet.',
  })
  async applicationForm(@Parent() roleSet: RoleSet): Promise<IForm> {
    return await this.roleSetService.getApplicationForm(roleSet);
  }

  // Role definitions are not protected
  @ResolveField('roleDefinitions', () => [IRole], {
    nullable: false,
    description: 'The Role Definitions included in this roleSet.',
  })
  async roleDefinitions(
    @Parent() roleSet: RoleSet,
    @Args('roles', { type: () => [RoleName], nullable: true })
    roles: RoleName[] | undefined
  ): Promise<IRole[]> {
    return await this.roleSetService.getRoleDefinitions(roleSet, roles);
  }

  // The set of fields from here down are not protected
  @ResolveField('roleDefinition', () => IRole, {
    nullable: false,
    description: 'The Role Definitions from this RoleSet to return.',
  })
  async roleDefinition(
    @Parent() roleSet: RoleSet,
    @Args('role', { type: () => RoleName, nullable: false })
    role: RoleName
  ): Promise<IRole> {
    return await this.roleSetService.getRoleDefinition(roleSet, role);
  }

  @ResolveField('roleNames', () => [RoleName], {
    nullable: false,
    description: 'The Roles available in this roleSet.',
  })
  async roleNames(@Parent() roleSet: RoleSet): Promise<RoleName[]> {
    return (await this.roleSetService.getRoleDefinitions(roleSet)).map(
      role => role.name
    );
  }

  @ResolveField('myMembershipStatus', () => CommunityMembershipStatus, {
    nullable: true,
    description: 'The membership status of the currently logged in user.',
  })
  async myMembershipStatus(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roleSet: RoleSet
  ): Promise<CommunityMembershipStatus> {
    // Uses the DataLoader to batch load membership statuses
    return this.membershipStatusLoader.loader.load({ actorContext, roleSet });
  }

  @ResolveField('myRoles', () => [RoleName], {
    nullable: false,
    description:
      'The roles on this community for the currently logged in user.',
  })
  async myRoles(
    @Parent() roleSet: RoleSet,
    @CurrentActor() actorContext: ActorContext
  ): Promise<RoleName[]> {
    // Utilize the loader to batch getRolesForActorContext calls.
    return this.actorRolesLoader.loader.load({ actorContext, roleSet });
  }

  @ResolveField('myRolesImplicit', () => [RoleSetRoleImplicit], {
    nullable: false,
    description:
      'The implicit roles on this community for the currently logged in user.',
  })
  async myRolesImplicit(
    @CurrentActor() actorContext: ActorContext,
    @Parent() roleSet: IRoleSet
  ): Promise<RoleSetRoleImplicit[]> {
    return this.roleSetService.getImplicitRoles(actorContext, roleSet);
  }
}
