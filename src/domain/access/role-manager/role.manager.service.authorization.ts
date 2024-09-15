import { Injectable } from '@nestjs/common';
import { RoleManagerService } from './role.manager.service';
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
  CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL,
  CREDENTIAL_RULE_TYPES_ACCESS_VIRTUAL_CONTRIBUTORS,
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
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAgent } from '@domain/agent';
import { PlatformInvitationAuthorizationService } from '@platform/invitation/platform.invitation.service.authorization';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ApplicationAuthorizationService } from '@domain/community/application/application.service.authorization';
import { InvitationAuthorizationService } from '@domain/community/invitation/invitation.service.authorization';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { CommunityRoleType } from '@common/enums/community.role';
import { IRoleManager } from './role.manager.interface';

@Injectable()
export class RoleManagerAuthorizationService {
  constructor(
    private licenseEngineService: LicenseEngineService,
    private roleManagerService: RoleManagerService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private virtualContributorService: VirtualContributorService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    roleManagerID: string,
    parentAuthorization: IAuthorizationPolicy,
    levelZeroSpaceAgent: IAgent,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean,
    isSubspace: boolean
  ): Promise<IAuthorizationPolicy[]> {
    const roleManager = await this.roleManagerService.getRoleManagerOrFail(
      roleManagerID,
      {
        relations: {
          roles: true,
          applications: true,
          invitations: true,
          platformInvitations: true,
        },
      }
    );
    if (
      !roleManager.roles ||
      !roleManager.applications ||
      !roleManager.invitations ||
      !roleManager.platformInvitations
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for roleManager authorization: ${roleManager.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    roleManager.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        roleManager.authorization,
        parentAuthorization
      );

    roleManager.authorization = this.appendPrivilegeRules(
      roleManager.authorization
    );

    roleManager.authorization = await this.extendAuthorizationPolicy(
      roleManager,
      roleManager.authorization,
      parentAuthorization?.anonymousReadAccess,
      levelZeroSpaceAgent,
      spaceSettings
    );
    roleManager.authorization = this.appendVerifiedCredentialRules(
      roleManager.authorization
    );
    if (spaceMembershipAllowed) {
      roleManager.authorization =
        this.extendRoleManagerAuthorizationPolicySpace(
          roleManager,
          roleManager.authorization,
          spaceSettings
        );
    }
    if (isSubspace) {
      roleManager.authorization = this.extendAuthorizationPolicySubspace(
        roleManager,
        roleManager.authorization,
        spaceSettings
      );
    }

    // always false
    roleManager.authorization.anonymousReadAccess = false;

    updatedAuthorizations.push(roleManager.authorization);

    for (const application of roleManager.applications) {
      const applicationAuthReset =
        await this.applicationAuthorizationService.applyAuthorizationPolicy(
          application,
          roleManager.authorization
        );
      application.authorization = applicationAuthReset;
    }

    for (const invitation of roleManager.invitations) {
      const invitationReset =
        await this.invitationAuthorizationService.applyAuthorizationPolicy(
          invitation,
          roleManager.authorization
        );
      invitation.authorization = invitationReset;
    }

    for (const externalInvitation of roleManager.platformInvitations) {
      const platformInvitationAuthorization =
        await this.platformInvitationAuthorizationService.applyAuthorizationPolicy(
          externalInvitation,
          roleManager.authorization
        );
      updatedAuthorizations.push(platformInvitationAuthorization);
    }

    return updatedAuthorizations;
  }

  private extendRoleManagerAuthorizationPolicySpace(
    roleManager: IRoleManager,
    roleManagerAuthorization: IAuthorizationPolicy | undefined,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!roleManagerAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${roleManager.id}`,
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
    const trustedOrganizationIDs: string[] = [];
    for (const trustedOrganizationID of trustedOrganizationIDs) {
      const hostOrgMembersCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: trustedOrganizationID,
            },
          ],
          CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN
        );
      hostOrgMembersCanJoin.cascade = false;
      newRules.push(hostOrgMembersCanJoin);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      roleManagerAuthorization,
      newRules
    );
  }

  private async extendAuthorizationPolicy(
    roleManager: IRoleManager,
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined,
    levelZeroSpaceAgent: IAgent,
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
      this.roleManagerService.getCredentialsForRoleWithParents(
        roleManager,
        CommunityRoleType.ADMIN,
        spaceSettings
      );
    if (spaceSettings.membership.allowSubspaceAdminsToInviteMembers) {
      // use the member credential to create subspace admin credential
      const subspaceAdminCredential: ICredentialDefinition =
        this.roleManagerService.getCredentialForRole(
          roleManager,
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

    if (allowGlobalRegisteredReadAccess) {
      const globalRegistered =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          [AuthorizationPrivilege.READ],
          [AuthorizationCredential.GLOBAL_REGISTERED],
          CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED
        );
      newRules.push(globalRegistered);
    }

    const accessVirtualContributors =
      await this.licenseEngineService.isAccessGranted(
        LicensePrivilege.SPACE_VIRTUAL_CONTRIBUTOR_ACCESS,
        levelZeroSpaceAgent
      );
    if (accessVirtualContributors) {
      const criterias: ICredentialDefinition[] =
        this.roleManagerService.getCredentialsForRoleWithParents(
          roleManager,
          CommunityRoleType.ADMIN,
          spaceSettings
        );
      criterias.push({
        type: AuthorizationCredential.GLOBAL_ADMIN,
        resourceID: '',
      });
      const accessVCsRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.ACCESS_VIRTUAL_CONTRIBUTOR],
          criterias,
          CREDENTIAL_RULE_TYPES_ACCESS_VIRTUAL_CONTRIBUTORS
        );
      accessVCsRule.cascade = true; // TODO: ideally make this not cascade so it is more specific
      newRules.push(accessVCsRule);
    }

    //
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private extendAuthorizationPolicySubspace(
    roleManager: IRoleManager,
    authorization: IAuthorizationPolicy | undefined,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.SPACES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const parentRoleManagerCredential =
      this.roleManagerService.getDirectParentCredentialForRole(
        roleManager,
        CommunityRoleType.MEMBER
      );

    // Allow member of the parent roleManager to Apply
    if (parentRoleManagerCredential) {
      const membershipSettings = spaceSettings.membership;
      switch (membershipSettings.policy) {
        case CommunityMembershipPolicy.APPLICATIONS:
          const spaceMemberCanApply =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_APPLY],
              [parentRoleManagerCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY
            );
          spaceMemberCanApply.cascade = false;
          newRules.push(spaceMemberCanApply);
          break;
        case CommunityMembershipPolicy.OPEN:
          const spaceMemberCanJoin =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_JOIN],
              [parentRoleManagerCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN
            );
          spaceMemberCanJoin.cascade = false;
          newRules.push(spaceMemberCanJoin);
          break;
      }
    }

    const adminCredentials =
      this.roleManagerService.getCredentialsForRoleWithParents(
        roleManager,
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
    roleManager: IRoleManager,
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

    const clonedRoleManagerAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        roleManager.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedRoleManagerAuthorization,
        newRules
      );

    return updatedAuthorization;
  }

  public async extendAuthorizationPolicyForVirtualContributorRemoval(
    roleManager: IRoleManager,
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

    const clonedRoleManagerAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        roleManager.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedRoleManagerAuthorization,
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
