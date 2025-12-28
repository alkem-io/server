import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoleSetService } from './role.set.service';
import { CurrentUser } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IRoleSet } from './role.set.interface';
import { RoleName } from '@common/enums/role.name';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AssignRoleOnRoleSetInput } from './dto/role.set.dto.role.assign';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { RemoveRoleOnRoleSetInput } from './dto/role.set.dto.role.remove';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { RoleSetType } from '@common/enums/role.set.type';
import { ValidationException } from '@common/exceptions';
import { InstrumentResolver } from '@src/apm/decorators';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ActorType } from '@common/enums/actor.type';

@InstrumentResolver()
@Resolver()
export class RoleSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private actorLookupService: ActorLookupService,
    private userAuthorizationService: UserAuthorizationService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private licenseService: LicenseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description: 'Assigns a User to a role in the specified Community.',
  })
  async assignRoleToUser(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: AssignRoleOnRoleSetInput
  ): Promise<IUser> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    this.validateRoleSetTypeOrFail(roleSet, [
      RoleSetType.SPACE,
      RoleSetType.ORGANIZATION,
    ]);

    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (roleData.role === RoleName.MEMBER) {
          privilegeRequired = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        break;
      }
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      privilegeRequired,
      `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
    );

    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorId,
      actorContext,
      true
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        // reset the user authorization policy so that their profile is visible to other community members
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(
            roleData.actorId
          );
        await this.authorizationPolicyService.saveAll(authorizations);

        break;
      }
      case RoleSetType.ORGANIZATION: {
        break;
      }
    }

    return await this.userLookupService.getUserByIdOrFail(roleData.actorId);
  }

  @Mutation(() => IOrganization, {
    description: 'Assigns an Organization a Role in the specified Community.',
  })
  async assignRoleToOrganization(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData')
    roleData: AssignRoleOnRoleSetInput
  ): Promise<IOrganization> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    // Check if has **both** grant + assign org privileges
    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION,
      `assign organization RoleSet role: ${roleSet.id}`
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization RoleSet role: ${roleSet.id}`
    );
    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorId
    );
    return await this.organizationLookupService.getOrganizationByIdOrFail(
      roleData.actorId
    );
  }

  @Mutation(() => IVirtualContributor, {
    description:
      'Assigns a Virtual Contributor to a role in the specified Community.',
  })
  async assignRoleToVirtualContributor(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: AssignRoleOnRoleSetInput
  ): Promise<IVirtualContributor> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID,
      {
        relations: {
          license: {
            entitlements: true,
          },
        },
      }
    );

    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    // Note re COMMUNITY_ASSIGN_VC_FROM_ACCOUNT
    // The ability to assign the VC is a function of the space and the VC, not of the user
    // So it is a privilege to be able to assign from the same account,
    // but this is separate from the business logic check that the space and the
    // account are in the same account.
    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (roleData.role === RoleName.MEMBER) {
      const sameAccount =
        await this.roleSetService.isRoleSetAccountMatchingVcAccount(
          roleSet,
          roleData.actorId
        );
      if (sameAccount) {
        requiredPrivilege =
          AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT;
      } else {
        requiredPrivilege = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
      }
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      requiredPrivilege,
      `assign virtual community role: ${roleSet.id}`
    );

    // Also require SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS entitlement for the RoleSet
    if (roleSet.type === RoleSetType.SPACE) {
      this.licenseService.isEntitlementEnabledOrFail(
        roleSet.license,
        LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS
      );
    }

    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorId,
      actorContext,
      true
    );

    return await this.virtualContributorLookupService.getVirtualContributorByIdOrFail(
      roleData.actorId
    );
  }

  @Mutation(() => IUser, {
    description: 'Removes a User from a Role in the specified Community.',
  })
  async removeRoleFromUser(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: RemoveRoleOnRoleSetInput
  ): Promise<IUser> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [
      RoleSetType.SPACE,
      RoleSetType.ORGANIZATION,
    ]);

    let privilegeRequired = AuthorizationPrivilege.GRANT;
    let extendedAuthorization = roleSet.authorization;
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (roleData.role === RoleName.MEMBER) {
          // Extend the authorization policy with a credential rule to assign the GRANT privilege
          // to the user specified in the incoming mutation. Then if it is the same user as is logged
          // in then the user will have the GRANT privilege + so can carry out the mutation
          extendedAuthorization =
            this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
              roleSet,
              roleData.actorId
            );
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (roleData.role === RoleName.ASSOCIATE) {
          // Extend the authorization policy with a credential rule to assign the GRANT privilege
          // to the user specified in the incoming mutation. Then if it is the same user as is logged
          // in then the user will have the GRANT privilege + so can carry out the mutation
          extendedAuthorization =
            this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
              roleSet,
              roleData.actorId
            );
        }
        break;
      }
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      privilegeRequired,
      `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
    );

    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorId,
      true
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        // reset the user authorization policy so that their profile is not visible
        // to other community members
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(
            roleData.actorId
          );
        await this.authorizationPolicyService.saveAll(authorizations);

        break;
      }
      case RoleSetType.ORGANIZATION: {
        break;
      }
    }

    return await this.userLookupService.getUserByIdOrFail(roleData.actorId);
  }

  @Mutation(() => IOrganization, {
    description:
      'Removes an Organization from a Role in the specified Community.',
  })
  async removeRoleFromOrganization(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: RemoveRoleOnRoleSetInput
  ): Promise<IOrganization> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    await this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community role organization: ${roleSet.id}`
    );

    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorId
    );
    return await this.organizationLookupService.getOrganizationByIdOrFail(
      roleData.actorId
    );
  }

  @Mutation(() => IVirtualContributor, {
    description: 'Removes a Virtual from a Role in the specified Community.',
  })
  async removeRoleFromVirtualContributor(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: RemoveRoleOnRoleSetInput
  ): Promise<IVirtualContributor> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user with rights around the incoming virtual being removed.
    //. Then if it is the user that is logged in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      await this.roleSetAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval(
        roleSet,
        roleData.actorId
      );

    await this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove virtual from community role: ${roleSet.id}`
    );

    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorId
    );

    return await this.virtualContributorLookupService.getVirtualContributorByIdOrFail(
      roleData.actorId
    );
  }

  @Mutation(() => IActor, {
    description:
      'Assigns a Contributor (User, Organization, or Virtual Contributor) to a role in the specified RoleSet.',
  })
  async assignRole(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: AssignRoleOnRoleSetInput
  ): Promise<IActor> {
    // Look up contributor to determine its type (lightweight - only need id, type)
    const contributor = await this.actorLookupService.getActorByIdOrFail(
      roleData.actorId
    );

    // Load roleSet with license for VC entitlement checks
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID,
      {
        relations: {
          license: {
            entitlements: true,
          },
        },
      }
    );

    // Type-specific authorization and validation
    switch (contributor.type) {
      case ActorType.USER:
        await this.authorizeAssignUser(actorContext, roleSet, roleData.role);
        break;
      case ActorType.ORGANIZATION:
        await this.authorizeAssignOrganization(actorContext, roleSet);
        break;
      case ActorType.VIRTUAL:
        await this.authorizeAssignVirtualContributor(
          actorContext,
          roleSet,
          roleData.role,
          roleData.actorId
        );
        break;
    }

    // Assign the role (generic for all contributor types)
    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorId,
      actorContext,
      true
    );

    // Type-specific post-actions
    if (
      contributor.type === ActorType.USER &&
      roleSet.type === RoleSetType.SPACE
    ) {
      const authorizations =
        await this.userAuthorizationService.applyAuthorizationPolicy(
          contributor.id
        );
      await this.authorizationPolicyService.saveAll(authorizations);
    }

    return contributor;
  }

  @Mutation(() => IActor, {
    description:
      'Removes a Contributor (User, Organization, or Virtual Contributor) from a role in the specified RoleSet.',
  })
  async removeRole(
    @CurrentUser() actorContext: ActorContext,
    @Args('roleData') roleData: RemoveRoleOnRoleSetInput
  ): Promise<IActor> {
    // Look up contributor to determine its type (lightweight - only need id, type)
    const contributor = await this.actorLookupService.getActorByIdOrFail(
      roleData.actorId
    );

    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    // Type-specific authorization
    switch (contributor.type) {
      case ActorType.USER:
        await this.authorizeRemoveUser(
          actorContext,
          roleSet,
          roleData.role,
          roleData.actorId
        );
        break;
      case ActorType.ORGANIZATION:
        await this.authorizeRemoveOrganization(actorContext, roleSet);
        break;
      case ActorType.VIRTUAL:
        await this.authorizeRemoveVirtualContributor(
          actorContext,
          roleSet,
          roleData.actorId
        );
        break;
    }

    // Remove the role (generic for all contributor types)
    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorId,
      contributor.type === ActorType.USER // triggerNewMemberEvents only for users
    );

    // Type-specific post-actions
    if (
      contributor.type === ActorType.USER &&
      roleSet.type === RoleSetType.SPACE
    ) {
      const authorizations =
        await this.userAuthorizationService.applyAuthorizationPolicy(
          contributor.id
        );
      await this.authorizationPolicyService.saveAll(authorizations);
    }

    return contributor;
  }

  // Authorization helpers for assign operations
  private async authorizeAssignUser(
    actorContext: ActorContext,
    roleSet: IRoleSet,
    role: RoleName
  ): Promise<void> {
    this.validateRoleSetTypeOrFail(roleSet, [
      RoleSetType.SPACE,
      RoleSetType.ORGANIZATION,
    ]);

    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
    switch (roleSet.type) {
      case RoleSetType.SPACE:
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (role === RoleName.MEMBER) {
          privilegeRequired = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
        }
        break;
      case RoleSetType.ORGANIZATION:
        privilegeRequired = AuthorizationPrivilege.GRANT;
        break;
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      privilegeRequired,
      `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
    );
  }

  private async authorizeAssignOrganization(
    actorContext: ActorContext,
    roleSet: IRoleSet
  ): Promise<void> {
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION,
      `assign organization RoleSet role: ${roleSet.id}`
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization RoleSet role: ${roleSet.id}`
    );
  }

  private async authorizeAssignVirtualContributor(
    actorContext: ActorContext,
    roleSet: IRoleSet,
    role: RoleName,
    contributorID: string
  ): Promise<void> {
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (role === RoleName.MEMBER) {
      const sameAccount =
        await this.roleSetService.isRoleSetAccountMatchingVcAccount(
          roleSet,
          contributorID
        );
      if (sameAccount) {
        requiredPrivilege =
          AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT;
      } else {
        requiredPrivilege = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
      }
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      requiredPrivilege,
      `assign virtual community role: ${roleSet.id}`
    );

    // Also require VC access entitlement
    if (roleSet.type === RoleSetType.SPACE) {
      this.licenseService.isEntitlementEnabledOrFail(
        roleSet.license,
        LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS
      );
    }
  }

  // Authorization helpers for remove operations
  private async authorizeRemoveUser(
    actorContext: ActorContext,
    roleSet: IRoleSet,
    role: RoleName,
    contributorID: string
  ): Promise<void> {
    this.validateRoleSetTypeOrFail(roleSet, [
      RoleSetType.SPACE,
      RoleSetType.ORGANIZATION,
    ]);

    let extendedAuthorization = roleSet.authorization;

    switch (roleSet.type) {
      case RoleSetType.SPACE:
        if (role === RoleName.MEMBER) {
          extendedAuthorization =
            this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
              roleSet,
              contributorID
            );
        }
        break;
      case RoleSetType.ORGANIZATION:
        if (role === RoleName.ASSOCIATE) {
          extendedAuthorization =
            this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
              roleSet,
              contributorID
            );
        }
        break;
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
    );
  }

  private async authorizeRemoveOrganization(
    actorContext: ActorContext,
    roleSet: IRoleSet
  ): Promise<void> {
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    this.authorizationService.grantAccessOrFail(
      actorContext,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community role organization: ${roleSet.id}`
    );
  }

  private async authorizeRemoveVirtualContributor(
    actorContext: ActorContext,
    roleSet: IRoleSet,
    contributorID: string
  ): Promise<void> {
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    const extendedAuthorization =
      await this.roleSetAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval(
        roleSet,
        contributorID
      );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove virtual from community role: ${roleSet.id}`
    );
  }

  private validateRoleSetTypeOrFail(
    roleSet: IRoleSet,
    allowedRoleSetTypes: RoleSetType[]
  ) {
    if (!allowedRoleSetTypes.includes(roleSet.type)) {
      throw new ValidationException(
        `Unable to carry out mutation on roleSet of type: ${roleSet.type}`,
        LogContext.PLATFORM
      );
    }
  }
}
