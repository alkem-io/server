import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { ValidationException } from '@common/exceptions';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignRoleOnRoleSetToOrganizationInput } from './dto/role.set.dto.role.assign.organization';
import { AssignRoleOnRoleSetToUserInput } from './dto/role.set.dto.role.assign.user';
import { AssignRoleOnRoleSetToVirtualContributorInput } from './dto/role.set.dto.role.assign.virtual';
import { RemoveRoleOnRoleSetFromOrganizationInput } from './dto/role.set.dto.role.remove.organization';
import { RemoveRoleOnRoleSetFromUserInput } from './dto/role.set.dto.role.remove.user';
import { RemoveRoleOnRoleSetFromVirtualContributorInput } from './dto/role.set.dto.role.remove.virtual';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';

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
