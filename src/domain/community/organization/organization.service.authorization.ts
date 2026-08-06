import {
  CREDENTIAL_RULE_ORGANIZATION_ADMIN,
  CREDENTIAL_RULE_ORGANIZATION_READ,
  CREDENTIAL_RULE_TYPES_DELETE_ORGANIZATION,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IOrganization } from '@domain/community/organization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { Injectable } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { OrganizationVerificationAuthorizationService } from '../organization-verification/organization.verification.service.authorization';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { OrganizationService } from './organization.service';

@Injectable()
export class OrganizationAuthorizationService {
  constructor(
    private organizationService: OrganizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private organizationVerificationAuthorizationService: OrganizationVerificationAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    organizationInput: IOrganization
  ): Promise<IAuthorizationPolicy[]> {
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationInput.id,
      {
        loadEagerRelations: false,
        relations: {
          storageAggregator: {
            authorization: true,
            directStorage: { authorization: true },
          },
          authorization: true,
          profile: { authorization: true },
          credentials: true,
          groups: { authorization: true },
          verification: { authorization: true },
          roleSet: true,
        },
      }
    );
    if (
      !organization.profile ||
      !organization.storageAggregator ||
      !organization.credentials ||
      !organization.groups ||
      !organization.verification ||
      !organization.roleSet
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for organization: ${organization.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    organization.authorization = this.authorizationPolicyService.reset(
      organization.authorization
    );
    organization.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        organization.authorization
      );

    const organizationAdminCredentials = [
      {
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: organization.id,
      },
      {
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: organization.id,
      },
    ];
    organization.authorization = this.appendCredentialRules(
      organization.authorization,
      organization.id,
      organizationAdminCredentials
    );
    updatedAuthorizations.push(organization.authorization);

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    let clonedOrganizationAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        organization.authorization
      );
    // To ensure that profile on an organization is always publicly visible, even for non-authenticated users
    clonedOrganizationAuthorizationAnonymousAccess =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        clonedOrganizationAuthorizationAnonymousAccess,
        AuthorizationPrivilege.READ
      );
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        organization.profile.id,
        clonedOrganizationAuthorizationAnonymousAccess
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        organization.storageAggregator,
        organization.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const additionalAdditionalRoleSetCredentialRules =
      await this.createAdditionalRoleSetCredentialRules(
        organizationAdminCredentials
      );
    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        organization.roleSet.id,
        organization.authorization,
        additionalAdditionalRoleSetCredentialRules
      );
    updatedAuthorizations.push(...roleSetAuthorizations);

    // Note: No separate actor/agent auth inheritance needed -
    // organization.authorization IS actor.authorization via getter delegation

    for (const group of organization.groups) {
      const groupAuthorizations =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          organization.authorization
        );
      updatedAuthorizations.push(...groupAuthorizations);
    }

    const verificationAuthorization =
      await this.organizationVerificationAuthorizationService.applyAuthorizationPolicy(
        organization.verification,
        organization.accountID
      );
    updatedAuthorizations.push(verificationAuthorization);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    organizationID: string,
    organizationAdminCredentials: ICredentialDefinition[]
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for organization',
        LogContext.COMMUNITY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to reset authorization
    const globalAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    // 027-platform-role-redesign (T076/T074, FR-007(d)) — three rules deleted
    // here, all of them legacy-credential grant sets with a live replacement:
    //
    //  1. `globalCommunityRead` — READ to `global-community-read`. The role is
    //     retired with no successor in the 13: organizations are readable by
    //     every registered user through `CREDENTIAL_RULE_ORGANIZATION_READ`
    //     below, so a dedicated global community reader granted nothing extra.
    //  2. `globalSupportManage` — blanket CRUD to `global-support`. Replaced by
    //     the two purpose-built Support privileges Slice A added:
    //     `PLATFORM_SUPPORT_ORG_RESOURCES` (A7, the organization's own
    //     packs/hubs and their templates) and `DELETE_ORGANIZATION` (A6). That
    //     split is FR-007(e): blanket CRUD on the organization tree also
    //     satisfied the owner branch of actions Support does not own.
    //  3. `globalAdminPlatformAdmin…` — the `PLATFORM_ADMIN` catch-all. Its
    //     surfaces are re-gated per family (T074); the privilege is gone.
    const readPrivilege = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [
        {
          type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
          resourceID: organizationID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: organizationID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: organizationID,
        },
        {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
          resourceID: '',
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_READ
    );
    newRules.push(readPrivilege);

    const organizationAdmin =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN,
          // 027-platform-role-redesign (T078, FR-020, A17): renaming is owned
          // by the ENTITY admin. This rule's criteria are the organization's
          // own admins/owners — no platform-role credential rides it.
          AuthorizationPrivilege.UPDATE_NAMEID,
        ],
        organizationAdminCredentials,
        CREDENTIAL_RULE_ORGANIZATION_ADMIN
      );
    organizationAdmin.cascade = true;
    newRules.push(organizationAdmin);

    // 027-platform-role-redesign (T039, A6 delete half, FR-007(e)):
    // deleteOrganization is gated DUAL-PATH — the owner keeps plain DELETE
    // (organizationAdmin above), the platform role uses this SEPARATE
    // privilege (T041). Deliberately NOT merged with CREATE_ORGANIZATION —
    // feature-organization-creator holds create, never delete. This dual
    // gate is only enforceable because T036 narrowed the root cascade to
    // exclude DELETE — while it still granted DELETE, Content Full Access
    // satisfied the owner branch and this privilege closed nothing
    // (eleventh analyze pass).
    const deleteOrganization =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.DELETE_ORGANIZATION],
        [AuthorizationCredential.PLATFORM_SUPPORT],
        CREDENTIAL_RULE_TYPES_DELETE_ORGANIZATION
      );
    deleteOrganization.cascade = false;
    newRules.push(deleteOrganization);

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private async createAdditionalRoleSetCredentialRules(
    organizationAdminCredentials: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicyRuleCredential[]> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // 027-platform-role-redesign (T076, Slice B): the "Later remove this" rule
    // is removed — this is later. It let `{global-admin, global-support}` assign
    // directly into any organization's role-set; no target role inherits that
    // (row 2 denies Content Full Access role assignment; row 1's Roles Admin
    // owns platform roles only). The organization's own admins keep it through
    // the rule immediately below.

    const organizationAdmin =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN],
        organizationAdminCredentials,
        CREDENTIAL_RULE_ORGANIZATION_ADMIN
      );
    organizationAdmin.cascade = false;
    newRules.push(organizationAdmin);

    return newRules;
  }
}
