import {
  CREDENTIAL_RULE_ORGANIZATION_ADMIN,
  CREDENTIAL_RULE_ORGANIZATION_READ,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_SUPPORT_MANAGE,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_PLATFORM_ADMIN,
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
import { AgentAuthorizationService } from '@domain/actor/actor/actor.service';
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
    private agentAuthorizationService: AgentAuthorizationService,
    private authorizationPolicy: AuthorizationPolicyService,
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
        relations: {
          storageAggregator: true,
          profile: true,
          credentials: true,
          groups: true,
          verification: true,
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
      this.authorizationPolicy.appendCredentialRuleAnonymousRegisteredAccess(
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

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        organization,
        organization.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

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
      this.authorizationPolicy.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    const globalCommunityRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_COMMUNITY_READ
      );
    newRules.push(globalCommunityRead);

    const globalSupportManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_SUPPORT],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_SUPPORT_MANAGE
      );
    newRules.push(globalSupportManage);

    // Allow global admins do platform admin actions
    const globalAdminPlatformAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_PLATFORM_ADMIN
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminPlatformAdminNotInherited);

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
        {
          type: AuthorizationCredential.GLOBAL_COMMUNITY_READ,
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
        ],
        organizationAdminCredentials,
        CREDENTIAL_RULE_ORGANIZATION_ADMIN
      );
    organizationAdmin.cascade = true;
    newRules.push(organizationAdmin);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }

  private async createAdditionalRoleSetCredentialRules(
    organizationAdminCredentials: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicyRuleCredential[]> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow Global admins + Global Space Admins to directly assign to roleSet
    // Later remove this
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS
      );
    globalAdmin.cascade = false;
    newRules.push(globalAdmin);

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
