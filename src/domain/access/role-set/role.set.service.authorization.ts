import {
  CREDENTIAL_RULE_ROLESET_SELF_REMOVAL,
  CREDENTIAL_RULE_ROLESET_VIRTUAL_CONTRIBUTOR_REMOVAL,
  CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_ASSIGN,
  POLICY_RULE_COMMUNITY_INVITE_MEMBER,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ApplicationAuthorizationService } from '@domain/access/application/application.service.authorization';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { PlatformInvitationAuthorizationService } from '@domain/access/invitation.platform/platform.invitation.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { authorizationPolicies } from '@domain/common/authorization-policy/authorization.policy.schema';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, Injectable } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';

@Injectable()
export class RoleSetAuthorizationService {
  constructor(
    private roleSetService: RoleSetService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb
  ) {}

  async applyAuthorizationPolicy(
    roleSetID: string,
    parentAuthorization: IAuthorizationPolicy | undefined,
    credentialRulesFromParent: IAuthorizationPolicyRuleCredential[] = [],
    privilegeRulesFromParent: AuthorizationPolicyRulePrivilege[] = []
  ): Promise<IAuthorizationPolicy[]> {
    // Use flat `with` to avoid Drizzle 0.45.x mapColumnsInSQLToAlias bug
    // with nested `{ relation: { with: { authorization: true } } }` patterns
    const roleSet = await this.roleSetService.getRoleSetOrFail(roleSetID, {
      with: {
        authorization: true,
        roles: true,
        applications: true,
        invitations: true,
        platformInvitations: true,
        license: true,
      },
    });

    // Batch-load authorization policies for child entities
    const childAuthIds = new Set<string>();
    for (const app of roleSet.applications ?? []) {
      if ((app as any).authorizationId)
        childAuthIds.add((app as any).authorizationId);
    }
    for (const inv of roleSet.invitations ?? []) {
      if ((inv as any).authorizationId)
        childAuthIds.add((inv as any).authorizationId);
    }
    for (const pi of roleSet.platformInvitations ?? []) {
      if ((pi as any).authorizationId)
        childAuthIds.add((pi as any).authorizationId);
    }
    if ((roleSet.license as any)?.authorizationId) {
      childAuthIds.add((roleSet.license as any).authorizationId);
    }

    if (childAuthIds.size > 0) {
      const childAuthPolicies =
        await this.db.query.authorizationPolicies.findMany({
          where: inArray(authorizationPolicies.id, [...childAuthIds]),
        });
      const authMap = new Map(childAuthPolicies.map(a => [a.id, a]));

      for (const app of roleSet.applications ?? []) {
        if ((app as any).authorizationId) {
          (app as any).authorization = authMap.get(
            (app as any).authorizationId
          );
        }
      }
      for (const inv of roleSet.invitations ?? []) {
        if ((inv as any).authorizationId) {
          (inv as any).authorization = authMap.get(
            (inv as any).authorizationId
          );
        }
      }
      for (const pi of roleSet.platformInvitations ?? []) {
        if ((pi as any).authorizationId) {
          (pi as any).authorization = authMap.get(
            (pi as any).authorizationId
          );
        }
      }
      if ((roleSet.license as any)?.authorizationId) {
        (roleSet.license as any).authorization = authMap.get(
          (roleSet.license as any).authorizationId
        );
      }
    }
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

    const globalAdminAddMembers =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ROLESET_ENTRY_ROLE_ASSIGN
      );
    newRules.push(globalAdminAddMembers);

    const globalAdminAddOrganizations =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.BETA_TESTER,
        ],
        'assign-organization-global-admins-beta-testers'
      );
    newRules.push(globalAdminAddOrganizations);

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

    const vcAccount =
      await this.virtualContributorLookupService.getAccountOrFail(
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
        CREDENTIAL_RULE_ROLESET_VIRTUAL_CONTRIBUTOR_REMOVAL
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
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN,
      POLICY_RULE_COMMUNITY_INVITE_MEMBER
    );

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [invitePrivilege]
    );
  }
}
