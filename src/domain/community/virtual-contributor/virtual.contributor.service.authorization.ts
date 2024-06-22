import { Injectable } from '@nestjs/common';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import {
  AccountException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { VirtualContributorService } from './virtual.contributor.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_ORGANIZATION_ADMIN,
  CREDENTIAL_RULE_ORGANIZATION_READ,
  CREDENTIAL_RULE_VIRTUAL_CONTRIBUTOR_CREATED_BY,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE,
  CREDENTIAL_RULE_TYPES_VC_GLOBAL_ADMINS,
} from '@common/constants';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { IVirtualContributor } from './virtual.contributor.interface';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IContributor } from '../contributor/contributor.interface';
import { Organization } from '../organization';
import { User } from '../user';

@Injectable()
export class VirtualContributorAuthorizationService {
  constructor(
    private virtualService: VirtualContributorService,
    private agentAuthorizationService: AgentAuthorizationService,
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    virtualInput: IVirtualContributor,
    host: IContributor,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IVirtualContributor> {
    const virtual = await this.virtualService.getVirtualContributorOrFail(
      virtualInput.id,
      {
        relations: {
          storageAggregator: true,
          profile: true,
          agent: true,
        },
      }
    );
    if (!virtual.profile || !virtual.storageAggregator || !virtual.agent)
      throw new RelationshipNotFoundException(
        `Unable to load entities for virtual: ${virtual.id} `,
        LogContext.COMMUNITY
      );
    virtual.authorization = await this.authorizationPolicyService.reset(
      virtual.authorization
    );
    virtual.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        virtual.authorization,
        parentAuthorization
      );
    virtual.authorization = this.appendCredentialRules(
      virtual.authorization,
      virtual.id
    );

    virtual.authorization = this.extendAuthorizationPolicy(
      virtual.authorization,
      host
    );

    // NOTE: Clone the authorization policy to ensure the changes are local to profile
    const clonedVirtualAuthorizationAnonymousAccess =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        virtual.authorization
      );
    // To ensure that profile on an virtual is always publicly visible, even for non-authenticated users
    clonedVirtualAuthorizationAnonymousAccess.anonymousReadAccess = true;
    virtual.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        virtual.profile,
        clonedVirtualAuthorizationAnonymousAccess
      );

    virtual.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        virtual.storageAggregator,
        virtual.authorization
      );

    virtual.agent = this.agentAuthorizationService.applyAuthorizationPolicy(
      virtual.agent,
      virtual.authorization
    );

    return virtual;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    accountID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for virtual: ${accountID}`,
        LogContext.COMMUNITY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalCommunityRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_COMMUNITY_READ
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
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_SUPPORT_MANAGE
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
        CREDENTIAL_RULE_TYPES_VC_GLOBAL_ADMINS
      );
    newRules.push(globalAdmin);

    const virtualAdmin = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.GRANT,
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [
        {
          type: AuthorizationCredential.ACCOUNT_HOST,
          resourceID: accountID,
        },
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: accountID,
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_ADMIN
    );

    newRules.push(virtualAdmin);

    const readPrivilege = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      [
        {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
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

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    host: IContributor
  ): IAuthorizationPolicy {
    if (!authorization) {
      throw new EntityNotInitializedException(
        `Authorization definition not found for: contributor ${host.id}`,
        LogContext.ACCOUNT
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Create the criterias for who can create a VC
    const hostSelfManagementCriterias: ICredentialDefinition[] = [];
    const accountHostCred = this.createCredentialCriteriaForHost(host);

    hostSelfManagementCriterias.push(accountHostCred);

    const selfManageVC = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      hostSelfManagementCriterias,
      CREDENTIAL_RULE_VIRTUAL_CONTRIBUTOR_CREATED_BY
    );
    selfManageVC.cascade = true;
    newRules.push(selfManageVC);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private createCredentialCriteriaForHost(
    host: IContributor
  ): ICredentialDefinition {
    if (host instanceof User) {
      return {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: host.id,
      };
    } else if (host instanceof Organization) {
      return {
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: host.id,
      };
    } else {
      throw new AccountException(
        `Unable to determine host type for: ${host.id}, of type '${host.constructor.name}'`,
        LogContext.ACCOUNT
      );
    }
  }
}
