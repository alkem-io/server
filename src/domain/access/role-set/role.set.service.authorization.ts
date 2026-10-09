import {
  CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL,
  CREDENTIAL_RULE_ROLESET_SELF_REMOVAL,
  CREDENTIAL_RULE_ROLESET_VIRTUAL_REMOVAL,
  POLICY_RULE_COMMUNITY_INVITE_MEMBER,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { PlatformInvitationAuthorizationService } from '@domain/access/invitation.platform/platform.invitation.service.authorization';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Injectable } from '@nestjs/common';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';

@Injectable()
export class RoleSetAuthorizationService {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private virtualActorLookupService: VirtualActorLookupService,
    private organizationLookupService: OrganizationLookupService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    roleSetID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = [],
    privilegeRulesFromParent: AuthorizationPolicyRulePrivilege[] = []
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
      !roleSet.license ||
      !roleSet.authorization
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

    // Take over the rules from the parent
    roleSet.authorization.credentialRules.push(...credentialRulesFromParent);
    roleSet.authorization.privilegeRules.push(...privilegeRulesFromParent);

    roleSet.authorization = this.appendPrivilegeRules(roleSet.authorization);

    roleSet.authorization = await this.extendAuthorizationPolicy(
      roleSet.authorization
    );

    updatedAuthorizations.push(roleSet.authorization);

    const invitationAuthorizations =
      await this.applyAuthorizationPolicyOnInvitationsApplications(roleSet);
    updatedAuthorizations.push(...invitationAuthorizations);

    const licenseAuthorization =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        roleSet.license,
        roleSet.authorization
      );
    updatedAuthorizations.push(...licenseAuthorization);

    return updatedAuthorizations;
  }

  public async applyAuthorizationPolicyOnInvitationsApplications(
    roleSet: IRoleSet
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !roleSet.invitations ||
      !roleSet.platformInvitations ||
      !roleSet.applications
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for roleSet authorization: ${roleSet.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

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

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // 027-platform-role-redesign (T076, Slice B) deleted the two blanket
    // type-only rules that gave `{global-admin, global-support(, beta-tester)}`
    // ROLESET_ENTRY_ROLE_ASSIGN / _ASSIGN_ORGANIZATION on every role set. No
    // target role inherits them, and the role set adds no entry-assign rule of
    // its own. The resulting model is intended (ruling 2026-10-08,
    // server#6623), pinned by this file's spec and the community one:
    // - L0 Space: users enter only by invitation, application or join; nobody
    //   holds ROLESET_ENTRY_ROLE_ASSIGN, so no direct user add, and no
    //   cross-account VC add (`assignRoleToVirtualContributor`).
    // - L1/L2 Space: direct user add stays with subspace/ancestor admins, plus
    //   Platform Support where the L0 sets `allowPlatformSupportAsAdmin`
    //   (`CommunityAuthorizationService.extendAuthorizationPolicySubspace`).
    // - Organizations enter any Space only by invitation: nobody holds
    //   ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION. Changing the role of one
    //   already in the role set needs GRANT only.
    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  public extendAuthorizationPolicyForSelfRemoval(
    roleSet: IRoleSet,
    userToBeRemovedID: string
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // This works as the ID of the user to be removed is used in the credential rule,
    // and only that actual user will have the credential for self management with that IR
    const userSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userToBeRemovedID,
          },
        ],
        CREDENTIAL_RULE_ROLESET_SELF_REMOVAL
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

  // TODO: replace with fixed rules, and two checks a) on roleSet, on VC itself?
  public async extendAuthorizationPolicyForVirtualContributorRemoval(
    roleSet: IRoleSet,
    virtualContributorToBeRemoved: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const vcAccount = await this.virtualActorLookupService.getAccountOrFail(
      virtualContributorToBeRemoved
    );
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: vcAccount.id,
    };

    const vcSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [accountAdminCredential],
        CREDENTIAL_RULE_ROLESET_VIRTUAL_REMOVAL
      );
    newRules.push(vcSelfRemovalRule);

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

  /**
   * Organization ADMIN/OWNER hold the implicit ACCOUNT_ADMIN credential on the
   * organization's account (see RoleSetService.getCredentialForOrganizationImplicitRole),
   * so they may remove their own organization. The clone is never persisted.
   */
  public async extendAuthorizationPolicyForOrganizationRemoval(
    roleSet: IRoleSet,
    organizationToBeRemovedID: string
  ): Promise<IAuthorizationPolicy> {
    const accountID =
      await this.organizationLookupService.getOrganizationAccountIdOrFail(
        organizationToBeRemovedID
      );
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: accountID,
    };

    const organizationSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        [accountAdminCredential],
        CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL
      );

    const clonedRoleSetAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        roleSet.authorization
      );

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      clonedRoleSetAuthorization,
      [organizationSelfRemovalRule]
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    // If you are able to add a member, then you are also logically able to invite a member
    const invitePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE],
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN,
      POLICY_RULE_COMMUNITY_INVITE_MEMBER
    );

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [invitePrivilege]
    );
  }
}
