import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { IOrganization, Organization } from '@domain/community/organization';
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
  CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL,
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
    private preferenceSetAuthorizationService: PreferenceSetAuthorizationService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>
  ) {}

  async applyAuthorizationPolicy(
    organizationInput: IOrganization
  ): Promise<IOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationInput.id,
      {
        relations: {
          storageAggregator: true,
          profile: true,
          agent: true,
          groups: true,
          verification: true,
          preferenceSet: true,
        },
      }
    );
    if (
      !organization.profile ||
      !organization.storageAggregator ||
      !organization.agent ||
      !organization.groups ||
      !organization.verification ||
      !organization.preferenceSet
    )
      throw new RelationshipNotFoundException(
        `Unable to load entities for organization: ${organization.id} `,
        LogContext.COMMUNITY
      );
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

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    const clonedOrganizationAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        organization.authorization
      );
    // To ensure that profile on an organization is always publicly visible, even for non-authenticated users
    clonedOrganizationAuthorizationAnonymousAccess.anonymousReadAccess = true;
    organization.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        organization.profile,
        clonedOrganizationAuthorizationAnonymousAccess
      );

    organization.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        organization.storageAggregator,
        organization.authorization
      );

    organization.agent =
      await this.agentAuthorizationService.applyAuthorizationPolicy(
        organization.agent,
        organization.authorization
      );

    for (const group of organization.groups) {
      const savedGroup =
        await this.userGroupAuthorizationService.applyAuthorizationPolicy(
          group,
          organization.authorization
        );
      group.authorization = savedGroup.authorization;
    }

    organization.verification =
      await this.organizationVerificationAuthorizationService.applyAuthorizationPolicy(
        organization.verification,
        organization.id
      );

    organization.preferenceSet =
      await this.preferenceSetAuthorizationService.applyAuthorizationPolicy(
        organization.preferenceSet,
        organization.authorization
      );

    return await this.organizationRepository.save(organization);
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

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_COMMUNITY_READ
      );
    newRules.push(communityAdmin);

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

  public extendAuthorizationPolicyForSelfRemoval(
    organization: IOrganization,
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
        CREDENTIAL_RULE_ORGANIZATION_SELF_REMOVAL
      );
    newRules.push(userSelfRemovalRule);

    const clonedOrganizationAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        organization.authorization
      );

    const updatedAuthorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        clonedOrganizationAuthorization,
        newRules
      );

    return updatedAuthorization;
  }
}
