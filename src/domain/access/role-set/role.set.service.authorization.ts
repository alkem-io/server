import { Injectable } from '@nestjs/common';
import { RoleSetService } from './role.set.service';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_COMMUNITY_SELF_REMOVAL,
  POLICY_RULE_COMMUNITY_INVITE_MEMBER,
  CREDENTIAL_RULE_COMMUNITY_VIRTUAL_CONTRIBUTOR_REMOVAL,
  CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_ADD,
} from '@common/constants';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { PlatformInvitationAuthorizationService } from '@domain/access/invitation.platform/platform.invitation.service.authorization';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { IRoleSet } from './role.set.interface';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';

@Injectable()
export class RoleSetAuthorizationService {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private accountLookupService: AccountLookupService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    roleSetID: string,
    roleSetAuthorization: IAuthorizationPolicy
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

    roleSet.authorization = this.appendPrivilegeRules(roleSetAuthorization);

    roleSet.authorization = await this.extendAuthorizationPolicy(
      roleSet.authorization
    );

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

  private async extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalAdminAddMembers =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ADD],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_ADD
      );
    newRules.push(globalAdminAddMembers);

    //
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

  // TODO: replace with fixed rules, and two checks a) on roleSet, on VC itself?
  public async extendAuthorizationPolicyForVirtualContributorRemoval(
    roleSet: IRoleSet,
    virtualContributorToBeRemoved: string
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const vcAccount =
      await this.virtualContributorLookupService.getAccountOrFail(
        virtualContributorToBeRemoved
      );
    const vcAccountHostCredentials =
      await this.accountLookupService.getHostCredentials(vcAccount);

    const vcSelfRemovalRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.GRANT],
        vcAccountHostCredentials,
        CREDENTIAL_RULE_COMMUNITY_VIRTUAL_CONTRIBUTOR_REMOVAL
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

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    // If you are able to add a member, then you are also logically able to invite a member
    const invitePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE],
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ADD,
      POLICY_RULE_COMMUNITY_INVITE_MEMBER
    );

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [invitePrivilege]
    );
  }
}
