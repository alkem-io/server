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
import { AuthorizationPolicyRuleVerifiedCredential } from '@core/authorization/authorization.policy.rule.verified.credential';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_COMMUNITY_READ_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_ACCESS_VIRTUAL_CONTRIBUTORS,
  CREDENTIAL_RULE_TYPES_COMMUNITY_ADD_MEMBERS,
  CREDENTIAL_RULE_TYPES_COMMUNITY_INVITE_MEMBERS,
  POLICY_RULE_COMMUNITY_ADD_VC,
  POLICY_RULE_COMMUNITY_INVITE_MEMBER,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN,
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
} from '@common/constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityGuidelinesAuthorizationService } from '../community-guidelines/community.guidelines.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { CommunityRoleType } from '@common/enums/community.role';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAgent } from '@domain/agent';
import { VirtualContributorService } from '../virtual-contributor/virtual.contributor.service';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private licenseEngineService: LicenseEngineService,
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private virtualContributorService: VirtualContributorService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityID: string,
    parentAuthorization: IAuthorizationPolicy,
    levelZeroSpaceAgent: IAgent,
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

    community.authorization = this.appendPrivilegeRules(
      community.authorization
    );

    community.authorization = await this.extendAuthorizationPolicy(
      community.authorization,
      parentAuthorization?.anonymousReadAccess,
      levelZeroSpaceAgent,
      community.roleSet,
      spaceSettings
    );
    community.authorization = this.appendVerifiedCredentialRules(
      community.authorization
    );
    if (spaceMembershipAllowed) {
      community.authorization = this.extendCommunityAuthorizationPolicySpace(
        community.authorization,
        community.roleSet,
        spaceSettings
      );
    }
    if (isSubspace) {
      community.authorization = await this.extendAuthorizationPolicySubspace(
        community.authorization,
        community.roleSet,
        spaceSettings
      );
    }

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

    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        community.roleSet.id,
        community.authorization,
        levelZeroSpaceAgent,
        spaceSettings,
        spaceMembershipAllowed,
        isSubspace
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

  private extendCommunityAuthorizationPolicySpace(
    communityAuthorization: IAuthorizationPolicy | undefined,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!communityAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(roleSet)}`,
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
      communityAuthorization,
      newRules
    );
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined,
    levelZeroSpaceAgent: IAgent,
    roleSet: IRoleSet,
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
        await this.roleSetService.getCredentialsForRoleWithParents(
          roleSet,
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

  private async extendAuthorizationPolicySubspace(
    authorization: IAuthorizationPolicy | undefined,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.SPACES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const parentCommunityCredential =
      await this.roleSetService.getDirectParentCredentialForRole(
        roleSet,
        CommunityRoleType.MEMBER
      );

    // Allow member of the parent community to Apply
    if (parentCommunityCredential) {
      const membershipSettings = spaceSettings.membership;
      switch (membershipSettings.policy) {
        case CommunityMembershipPolicy.APPLICATIONS:
          const spaceMemberCanApply =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_APPLY],
              [parentCommunityCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY
            );
          spaceMemberCanApply.cascade = false;
          newRules.push(spaceMemberCanApply);
          break;
        case CommunityMembershipPolicy.OPEN:
          const spaceMemberCanJoin =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_JOIN],
              [parentCommunityCredential],
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
