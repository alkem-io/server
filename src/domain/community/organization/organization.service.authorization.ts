import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { IOrganization } from '@domain/community/organization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { OrganizationService } from './organization.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { OrganizationVerificationAuthorizationService } from '../organization-verification/organization.verification.service.authorization';
import { PreferenceSetAuthorizationService } from '@domain/common/preference-set/preference.set.service.authorization';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_ORGANIZATION_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS,
  CREDENTIAL_RULE_ORGANIZATION_ADMIN,
  CREDENTIAL_RULE_ORGANIZATION_READ,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_SUPPORT_MANAGE,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_PLATFORM_ADMIN,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';

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
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService
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
          agent: true,
          groups: true,
          verification: true,
          preferenceSet: {
            preferences: true,
          },
        },
      }
    );
    if (
      !organization.profile ||
      !organization.storageAggregator ||
      !organization.agent ||
      !organization.groups ||
      !organization.verification ||
      !organization.preferenceSet ||
      !organization.preferenceSet.preferences
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for organization: ${organization.id} `,
        LogContext.COMMUNITY
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    organization.authorization = await this.authorizationPolicyService.reset(
      organization.authorization
    );
    organization.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        organization.authorization
      );
    organization.authorization = this.appendCredentialRules(
      organization.authorization,
      organization.id
    );
    updatedAuthorizations.push(organization.authorization);

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    let clonedOrganizationAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        organization.authorization
      );
    // To ensure that profile on an organization is always publicly visible, even for non-authenticated users
    clonedOrganizationAuthorizationAnonymousAccess =
      this.authorizationPolicy.appendCredentialRuleAnonymousAccess(
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

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        organization.agent,
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
        organization.id
      );
    updatedAuthorizations.push(verificationAuthorization);

    const preferenceSetAuthorizations =
      this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
        organization.preferenceSet,
        organization.authorization
      );
    updatedAuthorizations.push(...preferenceSetAuthorizations);

    return updatedAuthorizations;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    organizationID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for organization: ${organizationID}`,
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

    // Allow Global admins + Global Space Admins to manage access to Spaces + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS
      );
    newRules.push(globalAdmin);

    const organizationAdmin =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.ORGANIZATION_ADMIN,
            resourceID: organizationID,
          },
          {
            type: AuthorizationCredential.ORGANIZATION_OWNER,
            resourceID: organizationID,
          },
        ],
        CREDENTIAL_RULE_ORGANIZATION_ADMIN
      );

    newRules.push(organizationAdmin);

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

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
