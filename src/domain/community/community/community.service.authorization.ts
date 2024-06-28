import { Injectable } from '@nestjs/common';
import { CommunityService } from './community.service';
import { ICommunity } from '@domain/community/community';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { CommunicationAuthorizationService } from '@domain/communication/communication/communication.service.authorization';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
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
} from '@common/constants';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityGuidelinesAuthorizationService } from '../community-guidelines/community.guidelines.service.authorization';
import { CommunityPolicyService } from '../community-policy/community.policy.service';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { CommunityRole } from '@common/enums/community.role';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { IAgent } from '@domain/agent';
import { PlatformInvitationAuthorizationService } from '@platform/invitation/platform.invitation.service.authorization';
import { VirtualContributorService } from '../virtual-contributor/virtual.contributor.service';

@Injectable()
export class CommunityAuthorizationService {
  constructor(
    private licenseEngineService: LicenseEngineService,
    private communityService: CommunityService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communicationAuthorizationService: CommunicationAuthorizationService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private virtualContributorService: VirtualContributorService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private communityGuidelinesAuthorizationService: CommunityGuidelinesAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    communityInput: ICommunity,
    parentAuthorization: IAuthorizationPolicy | undefined,
    accountAgent: IAgent,
    communityPolicy: ICommunityPolicy
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      communityInput.id,
      {
        relations: {
          communication: {
            updates: true,
          },
          policy: true,
          groups: true,
          applications: true,
          invitations: true,
          platformInvitations: true,
          guidelines: {
            profile: true,
          },
        },
      }
    );
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.policy ||
      !community.groups ||
      !community.applications ||
      !community.invitations ||
      !community.platformInvitations
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community authorization: ${community.id} `,
        LogContext.COMMUNITY
      );
    }
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
      accountAgent,
      communityPolicy
    );
    community.authorization = this.appendVerifiedCredentialRules(
      community.authorization
    );

    // always false
    community.authorization.anonymousReadAccess = false;

    community.communication =
      await this.communicationAuthorizationService.applyAuthorizationPolicy(
        community.communication,
        community.authorization
      );

    // cascade
    for (const group of community.groups) {
      const savedGroup =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          community.authorization
        );
      group.authorization = savedGroup.authorization;
    }

    for (const application of community.applications) {
      const applicationAuthReset =
        await this.applicationAuthorizationService.applyAuthorizationPolicy(
          application,
          community.authorization
        );
      application.authorization = applicationAuthReset.authorization;
    }

    for (const invitation of community.invitations) {
      const invitationReset =
        await this.invitationAuthorizationService.applyAuthorizationPolicy(
          invitation,
          community.authorization
        );
      invitation.authorization = invitationReset.authorization;
    }

    for (const externalInvitation of community.platformInvitations) {
      const invitationReset =
        await this.platformInvitationAuthorizationService.applyAuthorizationPolicy(
          externalInvitation,
          community.authorization
        );
      externalInvitation.authorization = invitationReset.authorization;
    }

    if (community.guidelines) {
      community.guidelines =
        await this.communityGuidelinesAuthorizationService.applyAuthorizationPolicy(
          community.guidelines,
          community.authorization
        );
    }

    return community;
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    allowGlobalRegisteredReadAccess: boolean | undefined,
    accountAgent: IAgent,
    policy: ICommunityPolicy
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
      this.communityPolicyService.getCredentialsForRoleWithParents(
        policy,
        CommunityRole.ADMIN
      );
    if (policy.settings.membership.allowSubspaceAdminsToInviteMembers) {
      // use the member credential to create subspace admin credential
      const subspaceAdminCredential: ICredentialDefinition =
        this.communityPolicyService.getCredentialForRole(
          policy,
          CommunityRole.MEMBER
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
        LicensePrivilege.VIRTUAL_CONTRIBUTOR_ACCESS,
        accountAgent
      );
    if (accessVirtualContributors) {
      const criterias: ICredentialDefinition[] =
        this.communityPolicyService.getCredentialsForRoleWithParents(
          policy,
          CommunityRole.ADMIN
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
    community: ICommunity,
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

    const clonedCommunityAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        community.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedCommunityAuthorization,
        newRules
      );

    return updatedAuthorization;
  }

  public async extendAuthorizationPolicyForVirtualContributorRemoval(
    community: ICommunity,
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

    const clonedCommunityAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        community.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedCommunityAuthorization,
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
