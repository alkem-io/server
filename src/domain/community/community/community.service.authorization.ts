import {
  CREDENTIAL_RULE_ROLESET_ASSIGN,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN,
  CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_ROLESET_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_INVITE,
  CREDENTIAL_RULE_TYPES_SPACE_ROLESET_JOIN_GLOBAL_REGISTERED,
  POLICY_RULE_COMMUNITY_ADD_VC,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { Injectable } from '@nestjs/common';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CommunityService } from './community.service';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private roleSetService: RoleSetService,
    private platformRolesAccessService: PlatformRolesAccessService
  ) {}

  async applyAuthorizationPolicy(
    communityID: string,
    parentAuthorization: IAuthorizationPolicy,
    platformRolesAccess: IPlatformRolesAccess,
    spaceMembershipAllowed: boolean,
    spaceSettings: ISpaceSettings,
    isSubspace: boolean
  ): Promise<IAuthorizationPolicy[]> {
    const community = await this.communityService.getCommunityOrFail(
      communityID,
      {
        relations: {
          communication: {
            updates: true,
          },
          roleSet: true,
          groups: true,
        },
      }
    );
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.roleSet ||
      !community.groups
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community authorization: ${community.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    community.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        community.authorization,
        parentAuthorization
      );

    community.authorization = await this.extendAuthorizationPolicy(
      community.authorization,
      spaceSettings.privacy.mode === 'public'
    );

    updatedAuthorizations.push(community.authorization);

    const communicationAuthorizations =
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        community.communication,
        community.authorization
      );
    updatedAuthorizations.push(...communicationAuthorizations);

    // cascade
    for (const group of community.groups) {
      const groupAuthorizations =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          community.authorization
        );
      updatedAuthorizations.push(...groupAuthorizations);
    }

    const additionalRoleCredentialRules =
      await this.createAdditionalRoleSetCredentialRules(
        community.roleSet,
        spaceMembershipAllowed,
        isSubspace,
        platformRolesAccess,
        spaceSettings
      );

    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        community.roleSet.id,
        community.authorization,
        additionalRoleCredentialRules,
        this.createAdditionalRoleSetPrivilegeRules()
      );
    updatedAuthorizations.push(...roleSetAuthorizations);

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.READ],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED
        );
      globalRegistered.cascade = true;
      newRules.push(globalRegistered);
    }

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private async createAdditionalRoleSetCredentialRules(
    roleSet: IRoleSet,
    entryRoleAllowed: boolean,
    isSubspace: boolean,
    platformRolesWithAccess: IPlatformRolesAccess,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicyRuleCredential[]> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    if (roleSet.type !== RoleSetType.SPACE || !spaceSettings) {
      throw new RelationshipNotFoundException(
        `Missing space settings that are required for role sets of type Space: ${roleSet.id}`,
        LogContext.ROLES
      );
    }

    const inviteMembersCriterias: ICredentialDefinition[] =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN
      );
    const platformRolesWithGrant =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesWithAccess.roles,
        [AuthorizationPrivilege.GRANT]
      );
    inviteMembersCriterias.push(...platformRolesWithGrant);

    if (spaceSettings.membership.allowSubspaceAdminsToInviteMembers) {
      // use the member credential to create subspace admin credential
      const subspaceAdminCredential: ICredentialDefinition =
        await this.roleSetService.getCredentialForRole(
          roleSet,
          RoleName.MEMBER
        );
      subspaceAdminCredential.type =
        AuthorizationCredential.SPACE_SUBSPACE_ADMIN;
      inviteMembersCriterias.push(subspaceAdminCredential);
    }
    if (inviteMembersCriterias.length > 0) {
      const spaceAdminsInvite =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
            AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT,
          ],
          inviteMembersCriterias,
          CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_INVITE
        );
      spaceAdminsInvite.cascade = false;
      newRules.push(spaceAdminsInvite);
    }

    if (entryRoleAllowed) {
      newRules.push(
        ...this.extendRoleSetAuthorizationPolicySpace(spaceSettings)
      );
    }
    if (isSubspace) {
      newRules.push(
        ...(await this.extendAuthorizationPolicySubspace(
          roleSet,
          spaceSettings,
          platformRolesWithAccess
        ))
      );
    }

    return newRules;
  }

  private async extendAuthorizationPolicySubspace(
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
    platformRolesWithAccess: IPlatformRolesAccess
  ): Promise<IAuthorizationPolicyRuleCredential[]> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const parentRoleSetCredential =
      await this.roleSetService.getDirectParentCredentialForRole(
        roleSet,
        RoleName.MEMBER
      );

    // Allow member of the parent roleSet to Apply
    if (parentRoleSetCredential) {
      const membershipSettings = spaceSettings.membership;
      switch (membershipSettings.policy) {
        case CommunityMembershipPolicy.APPLICATIONS: {
          const spaceMemberCanApply =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY],
              [parentRoleSetCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY
            );
          spaceMemberCanApply.cascade = false;
          newRules.push(spaceMemberCanApply);
          break;
        }
        case CommunityMembershipPolicy.OPEN: {
          const spaceMemberCanJoin =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_JOIN],
              [parentRoleSetCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN
            );
          spaceMemberCanJoin.cascade = false;
          newRules.push(spaceMemberCanJoin);
          break;
        }
      }
    }

    const adminCredentials =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN
      );
    const platformRolesWithGrantCredentials =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesWithAccess.roles,
        [AuthorizationPrivilege.GRANT]
      );
    adminCredentials.push(...platformRolesWithGrantCredentials);

    if (adminCredentials.length > 0) {
      const addMembers = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN],
        adminCredentials,
        CREDENTIAL_RULE_ROLESET_ASSIGN
      );
      addMembers.cascade = false;
      newRules.push(addMembers);
    }

    return newRules;
  }

  private extendRoleSetAuthorizationPolicySpace(
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicyRuleCredential[] {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const membershipPolicy = spaceSettings.membership.policy;
    switch (membershipPolicy) {
      case CommunityMembershipPolicy.APPLICATIONS: {
        const anyUserCanApply =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_ROLESET_APPLY_GLOBAL_REGISTERED
          );
        anyUserCanApply.cascade = false;
        newRules.push(anyUserCanApply);
        break;
      }
      case CommunityMembershipPolicy.OPEN: {
        const anyUserCanJoin =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_JOIN],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_ROLESET_JOIN_GLOBAL_REGISTERED
          );
        anyUserCanJoin.cascade = false;
        newRules.push(anyUserCanJoin);
        break;
      }
    }

    // Associates of trusted organizations can join
    const trustedOrganizationIDs: UUID[] =
      spaceSettings.membership.trustedOrganizations;
    for (const trustedOrganizationID of trustedOrganizationIDs) {
      const hostOrgMembersCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_JOIN],
          [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: JSON.stringify(trustedOrganizationID),
            },
          ],
          CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN
        );
      hostOrgMembersCanJoin.cascade = false;
      newRules.push(hostOrgMembersCanJoin);
    }

    return newRules;
  }

  private createAdditionalRoleSetPrivilegeRules(): AuthorizationPolicyRulePrivilege[] {
    const createVCPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT],
      AuthorizationPrivilege.GRANT,
      POLICY_RULE_COMMUNITY_ADD_VC
    );

    return [createVCPrivilege];
  }
}
