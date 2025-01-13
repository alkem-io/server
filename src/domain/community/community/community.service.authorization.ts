import { Injectable } from '@nestjs/common';
import { CommunityService } from './community.service';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN,
  CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_INVITE,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  POLICY_RULE_COMMUNITY_ADD_VC,
} from '@common/constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityGuidelinesAuthorizationService } from '../community-guidelines/community.guidelines.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetType } from '@common/enums/role.set.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RoleName } from '@common/enums/role.name';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private roleSetService: RoleSetService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityID: string,
    parentAuthorization: IAuthorizationPolicy,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean,
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
          guidelines: {
            profile: true,
          },
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
      parentAuthorization?.anonymousReadAccess
    );

    // always false
    community.authorization.anonymousReadAccess = false;

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

    let clonedRoleSetAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        community.roleSet.authorization
      );
    clonedRoleSetAuth =
      this.authorizationPolicyService.inheritParentAuthorization(
        clonedRoleSetAuth,
        community.authorization
      );
    clonedRoleSetAuth = await this.extendRoleSetAuthorizationPolicy(
      community.roleSet,
      clonedRoleSetAuth,
      spaceMembershipAllowed,
      isSubspace,
      spaceSettings
    );
    clonedRoleSetAuth = this.appendRoleSetPrivilegeRules(clonedRoleSetAuth);
    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        community.roleSet.id,
        clonedRoleSetAuth
      );
    updatedAuthorizations.push(...roleSetAuthorizations);

    if (community.guidelines) {
      const guidelineAuthorizations =
        await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
          community.guidelines,
          community.authorization
        );
      updatedAuthorizations.push(...guidelineAuthorizations);
    }

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

  private async extendRoleSetAuthorizationPolicy(
    roleSet: IRoleSet,
    authorization: IAuthorizationPolicy | undefined,
    entryRoleAllowed: boolean,
    isSubspace: boolean,
    spaceSettings?: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    if (roleSet.type !== RoleSetType.SPACE || !spaceSettings) {
      throw new RelationshipNotFoundException(
        `Missing space settings that are requried for role sets of type Space: ${roleSet.id}`,
        LogContext.ROLES
      );
    }

    const inviteMembersCriterias: ICredentialDefinition[] =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN,
        spaceSettings
      );
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
    const spaceAdminsInvite =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
          AuthorizationPrivilege.COMMUNITY_ADD_MEMBER_VC_FROM_ACCOUNT,
        ],
        inviteMembersCriterias,
        CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_INVITE
      );
    spaceAdminsInvite.cascade = false;
    newRules.push(spaceAdminsInvite);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    if (entryRoleAllowed) {
      roleSet.authorization = this.extendRoleSetAuthorizationPolicySpace(
        roleSet,
        roleSet.authorization,
        spaceSettings
      );
    }
    if (isSubspace) {
      roleSet.authorization = await this.extendAuthorizationPolicySubspace(
        roleSet,
        roleSet.authorization,
        spaceSettings
      );
    }

    return updatedAuthorization;
  }

  private async extendAuthorizationPolicySubspace(
    roleSet: IRoleSet,
    authorization: IAuthorizationPolicy | undefined,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.SPACES
      );

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
        case CommunityMembershipPolicy.APPLICATIONS:
          const spaceMemberCanApply =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY],
              [parentRoleSetCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY
            );
          spaceMemberCanApply.cascade = false;
          newRules.push(spaceMemberCanApply);
          break;
        case CommunityMembershipPolicy.OPEN:
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

    const adminCredentials =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN,
        spaceSettings
      );

    const addMembers = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ADD],
      adminCredentials,
      CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER
    );
    addMembers.cascade = false;
    newRules.push(addMembers);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private extendRoleSetAuthorizationPolicySpace(
    roleSet: IRoleSet,
    roleSetAuthorization: IAuthorizationPolicy | undefined,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!roleSetAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${roleSet.id}`,
        LogContext.SPACES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const membershipPolicy = spaceSettings.membership.policy;
    switch (membershipPolicy) {
      case CommunityMembershipPolicy.APPLICATIONS:
        const anyUserCanApply =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED
          );
        anyUserCanApply.cascade = false;
        newRules.push(anyUserCanApply);
        break;
      case CommunityMembershipPolicy.OPEN:
        const anyUserCanJoin =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_JOIN],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED
          );
        anyUserCanJoin.cascade = false;
        newRules.push(anyUserCanJoin);
        break;
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

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      roleSetAuthorization,
      newRules
    );
  }
  private appendRoleSetPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const createVCPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER_VC_FROM_ACCOUNT],
      AuthorizationPrivilege.GRANT,
      POLICY_RULE_COMMUNITY_ADD_VC
    );

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createVCPrivilege]
    );
  }
}
