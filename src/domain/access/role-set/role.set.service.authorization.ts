import { Injectable } from '@nestjs/common';
import { RoleSetService } from './role.set.service';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL,
  CREDENTIAL_RULE_TYPES_COMMUNITY_ADD_MEMBERS,
  CREDENTIAL_RULE_TYPES_COMMUNITY_INVITE_MEMBERS,
  POLICY_RULE_COMMUNITY_ADD_VC,
  POLICY_RULE_COMMUNITY_INVITE_MEMBER,
  CREDENTIAL_RULE_COMMUNITY_VIRTUAL_CONTRIBUTOR_REMOVAL,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN,
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
} from '@common/constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { PlatformInvitationAuthorizationService } from '@platform/invitation/platform.invitation.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { CommunityRoleType } from '@common/enums/community.role';
import { IRoleSet } from './role.set.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';

@Injectable()
export class RoleSetAuthorizationService {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private virtualContributorService: VirtualContributorService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    roleSetID: string,
    parentAuthorization: IAuthorizationPolicy,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean,
    isSubspace: boolean
  ): Promise<IAuthorizationPolicy[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(roleSetID, {
      relations: {
        roles: true,
        applications: true,
        invitations: true,
        platformInvitations: true,
        license: true,
      },
    });
    if (
      !roleSet.roles ||
      !roleSet.applications ||
      !roleSet.invitations ||
      !roleSet.platformInvitations ||
      !roleSet.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for roleSet authorization: ${roleSet.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    roleSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        roleSet.authorization,
        parentAuthorization
      );

    roleSet.authorization = this.appendPrivilegeRules(roleSet.authorization);

    roleSet.authorization = await this.extendAuthorizationPolicy(
      roleSet,
      roleSet.authorization,
      spaceSettings
    );
    roleSet.authorization = this.appendVerifiedCredentialRules(
      roleSet.authorization
    );
    if (spaceMembershipAllowed) {
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

    updatedAuthorizations.push(roleSet.authorization);

    for (const application of roleSet.applications) {
      const applicationAuth =
        await this.applicationAuthorizationService.applyAuthorizationPolicy(
          application,
          roleSet.authorization
        );
      updatedAuthorizations.push(applicationAuth);
    }

    for (const invitation of roleSet.invitations) {
      const invitationAuth =
        await this.invitationAuthorizationService.applyAuthorizationPolicy(
          invitation,
          roleSet.authorization
        );
      updatedAuthorizations.push(invitationAuth);
    }

    for (const externalInvitation of roleSet.platformInvitations) {
      const platformInvitationAuthorization =
        await this.platformInvitationAuthorizationService.applyAuthorizationPolicy(
          externalInvitation,
          roleSet.authorization
        );
      updatedAuthorizations.push(platformInvitationAuthorization);
    }
    const licenseAuthorization =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        roleSet.license,
        roleSet.authorization
      );
    updatedAuthorizations.push(...licenseAuthorization);

    return updatedAuthorizations;
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
            [AuthorizationPrivilege.COMMUNITY_APPLY],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED
          );
        anyUserCanApply.cascade = false;
        newRules.push(anyUserCanApply);
        break;
      case CommunityMembershipPolicy.OPEN:
        const anyUserCanJoin =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.COMMUNITY_JOIN],
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
          [AuthorizationPrivilege.COMMUNITY_JOIN],
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

  private async extendAuthorizationPolicy(
    roleSet: IRoleSet,
    authorization: IAuthorizationPolicy | undefined,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalAdminAddMembers =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_COMMUNITY_ADD_MEMBERS
      );
    newRules.push(globalAdminAddMembers);

    const inviteMembersCriterias: ICredentialDefinition[] =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        CommunityRoleType.ADMIN,
        spaceSettings
      );
    if (spaceSettings.membership.allowSubspaceAdminsToInviteMembers) {
      // use the member credential to create subspace admin credential
      const subspaceAdminCredential: ICredentialDefinition =
        await this.roleSetService.getCredentialForRole(
          roleSet,
          CommunityRoleType.MEMBER
        );
      subspaceAdminCredential.type =
        AuthorizationCredential.SPACE_SUBSPACE_ADMIN;
      inviteMembersCriterias.push(subspaceAdminCredential);
    }
    const spaceAdminsInvite =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.COMMUNITY_INVITE,
          AuthorizationPrivilege.COMMUNITY_ADD_MEMBER_VC_FROM_ACCOUNT,
        ],
        inviteMembersCriterias,
        CREDENTIAL_RULE_TYPES_COMMUNITY_INVITE_MEMBERS
      );
    spaceAdminsInvite.cascade = false;
    newRules.push(spaceAdminsInvite);

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

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
        CommunityRoleType.MEMBER
      );

    // Allow member of the parent roleSet to Apply
    if (parentRoleSetCredential) {
      const membershipSettings = spaceSettings.membership;
      switch (membershipSettings.policy) {
        case CommunityMembershipPolicy.APPLICATIONS:
          const spaceMemberCanApply =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_APPLY],
              [parentRoleSetCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY
            );
          spaceMemberCanApply.cascade = false;
          newRules.push(spaceMemberCanApply);
          break;
        case CommunityMembershipPolicy.OPEN:
          const spaceMemberCanJoin =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_JOIN],
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
        CommunityRoleType.ADMIN,
        spaceSettings
      );

    const addMembers = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER],
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

  private appendVerifiedCredentialRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const verifiedCredentialRules: AuthorizationPolicyRuleVerifiedCredential[] =
      [];

    return this.authorizationPolicyService.appendVerifiedCredentialAuthorizationRules(
      authorization,
      verifiedCredentialRules
    );
  }

  public extendAuthorizationPolicyForSelfRemoval(
    roleSet: IRoleSet,
    userToBeRemovedID: string
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userToBeRemovedID,
          },
        ],
        CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedRoleSetAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        roleSet.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedRoleSetAuthorization,
        newRules
      );

    return updatedAuthorization;
  }

  public async extendAuthorizationPolicyForVirtualContributorRemoval(
    roleSet: IRoleSet,
    virtualContributorToBeRemoved: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const accountHostCredentials =
      await this.virtualContributorService.getAccountHostCredentials(
        virtualContributorToBeRemoved
      );

    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        accountHostCredentials,
        CREDENTIAL_RULE_COMMUNITY_VIRTUAL_CONTRIBUTOR_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedRoleSetAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        roleSet.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedRoleSetAuthorization,
        newRules
      );

    return updatedAuthorization;
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const createVCPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER_VC_FROM_ACCOUNT],
      AuthorizationPrivilege.GRANT,
      POLICY_RULE_COMMUNITY_ADD_VC
    );

    // If you are able to add a member, then you are also logically able to invite a member
    const invitePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_INVITE],
      AuthorizationPrivilege.COMMUNITY_ADD_MEMBER,
      POLICY_RULE_COMMUNITY_INVITE_MEMBER
    );

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createVCPrivilege, invitePrivilege]
    );
  }
}
