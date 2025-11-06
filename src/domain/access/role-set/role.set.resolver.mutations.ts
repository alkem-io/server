import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoleSetService } from './role.set.service';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IRoleSet } from './role.set.interface';
import { RoleName } from '@common/enums/role.name';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AssignRoleOnRoleSetToUserInput } from './dto/role.set.dto.role.assign.user';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { AssignRoleOnRoleSetToOrganizationInput } from './dto/role.set.dto.role.assign.organization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { AssignRoleOnRoleSetToVirtualContributorInput } from './dto/role.set.dto.role.assign.virtual';
import { RemoveRoleOnRoleSetFromUserInput } from './dto/role.set.dto.role.remove.user';
import { RemoveRoleOnRoleSetFromOrganizationInput } from './dto/role.set.dto.role.remove.organization';
import { RemoveRoleOnRoleSetFromVirtualContributorInput } from './dto/role.set.dto.role.remove.virtual';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { RoleSetType } from '@common/enums/role.set.type';
import { ValidationException } from '@common/exceptions';
import { InstrumentResolver } from '@src/apm/decorators';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';

@InstrumentResolver()
@Resolver()
export class RoleSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userLookupService: UserLookupService,
    private userAuthorizationService: UserAuthorizationService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private licenseService: LicenseService,
    private communityResolverService: CommunityResolverService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description: 'Assigns a User to a role in the specified Community.',
  })
  async assignRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignRoleOnRoleSetToUserInput
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
      agentInfo,
      roleSet.authorization,
      privilegeRequired,
      `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      agentInfo,
      true
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        // reset the user authorization policy so that their profile is visible to other community members
        const user = await this.userLookupService.getUserOrFail(
          roleData.contributorID
        );
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
        await this.authorizationPolicyService.saveAll(authorizations);

        // If ADMIN role was assigned and space has allowGuestContributions enabled,
        // trigger space authorization reset to grant PUBLIC_SHARE privileges immediately
        if (roleData.role === RoleName.ADMIN) {
          await this.triggerSpaceAuthorizationResetForAdminRoleChange(
            roleSet.id,
            'grant'
          );
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        break;
      }
    }

    return await this.userLookupService.getUserOrFail(roleData.contributorID);
  }

  @Mutation(() => IOrganization, {
    description: 'Assigns an Organization a Role in the specified Community.',
  })
  async assignRoleToOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData')
    roleData: AssignRoleOnRoleSetToOrganizationInput
  ): Promise<IOrganization> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    // Check if has **both** grant + assign org privileges
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION,
      `assign organization RoleSet role: ${roleSet.id}`
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization RoleSet role: ${roleSet.id}`
    );
    return await this.roleSetService.assignOrganizationToRole(
      roleSet,
      roleData.role,
      roleData.contributorID
    );
  }

  @Mutation(() => IVirtualContributor, {
    description:
      'Assigns a Virtual Contributor to a role in the specified Community.',
  })
  async assignRoleToVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignRoleOnRoleSetToVirtualContributorInput
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
          roleData.contributorID
        );
      if (sameAccount) {
        requiredPrivilege =
          AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT;
      } else {
        requiredPrivilege = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
      }
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
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

    await this.roleSetService.assignVirtualToRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      agentInfo,
      true
    );

    return await this.virtualContributorLookupService.getVirtualContributorOrFail(
      roleData.contributorID
    );
  }

  @Mutation(() => IUser, {
    description: 'Removes a User from a Role in the specified Community.',
  })
  async removeRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveRoleOnRoleSetFromUserInput
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
              roleData.contributorID
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
              roleData.contributorID
            );
        }
        break;
      }
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      privilegeRequired,
      `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
    );

    await this.roleSetService.removeUserFromRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      true
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        // reset the user authorization policy so that their profile is not visible
        // to other community members
        const user = await this.userLookupService.getUserOrFail(
          roleData.contributorID
        );
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
        await this.authorizationPolicyService.saveAll(authorizations);

        // If ADMIN role was removed and space has allowGuestContributions enabled,
        // trigger space authorization reset to revoke PUBLIC_SHARE privileges immediately
        if (roleData.role === RoleName.ADMIN) {
          await this.triggerSpaceAuthorizationResetForAdminRoleChange(
            roleSet.id,
            'revoke'
          );
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        break;
      }
    }

    return await this.userLookupService.getUserOrFail(roleData.contributorID);
  }

  @Mutation(() => IOrganization, {
    description:
      'Removes an Organization from a Role in the specified Community.',
  })
  async removeRoleFromOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveRoleOnRoleSetFromOrganizationInput
  ): Promise<IOrganization> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community role organization: ${roleSet.id}`
    );

    return await this.roleSetService.removeOrganizationFromRole(
      roleSet,
      roleData.role,
      roleData.contributorID
    );
  }

  @Mutation(() => IVirtualContributor, {
    description: 'Removes a Virtual from a Role in the specified Community.',
  })
  async removeRoleFromVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveRoleOnRoleSetFromVirtualContributorInput
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
        roleData.contributorID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove virtual from community role: ${roleSet.id}`
    );

    await this.roleSetService.removeVirtualFromRole(
      roleSet,
      roleData.role,
      roleData.contributorID
    );

    return await this.virtualContributorLookupService.getVirtualContributorOrFail(
      roleData.contributorID
    );
  }

  /**
   * Triggers space authorization reset when ADMIN role is granted or revoked.
   * This ensures that PUBLIC_SHARE privileges are immediately updated on all
   * whiteboards in spaces with allowGuestContributions enabled.
   *
   * User Story 4: New space admin privilege assignment
   */
  private async triggerSpaceAuthorizationResetForAdminRoleChange(
    roleSetID: string,
    operation: 'grant' | 'revoke'
  ): Promise<void> {
    try {
      // Get the space associated with this roleSet
      const space =
        await this.communityResolverService.getSpaceForRoleSetOrFail(roleSetID);

      this.logger.verbose?.(
        `Admin role ${operation}: triggering space authorization reset for PUBLIC_SHARE privileges`,
        LogContext.COLLABORATION
      );

      // Trigger space authorization reset cascade
      const authorizations =
        await this.spaceAuthorizationService.applyAuthorizationPolicy(space.id);
      await this.authorizationPolicyService.saveAll(authorizations);

      this.logger.verbose?.(
        `Admin role ${operation}: space authorization reset completed`,
        LogContext.COLLABORATION
      );
    } catch (error) {
      // Log but don't fail - this is a nice-to-have optimization
      // User can still manually trigger by toggling allowGuestContributions
      this.logger.warn?.(
        `Failed to trigger space authorization reset for admin role ${operation}: ${error}`,
        LogContext.COLLABORATION
      );
    }
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
