import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AccountService } from './account.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAccount } from './account.interface';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { LicenseAuthorizationService } from '@domain/license/license/license.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES,
  CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
} from '@common/constants/authorization/credential.rule.types.constants';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AccountHostService } from '../account.host/account.host.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { CommunityRole } from '@common/enums/community.role';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { POLICY_RULE_ACCOUNT_CREATE_VC } from '@common/constants/authorization/policy.rule.constants';

@Injectable()
export class AccountAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private accountService: AccountService,
    private accountHostService: AccountHostService
  ) {}

  async applyAuthorizationPolicy(accountInput: IAccount): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      accountInput.id,
      {
        relations: {
          agent: true,
          space: {
            community: {
              policy: true,
            },
          },
          license: true,
          library: true,
          defaults: true,
          virtualContributors: true,
          storageAggregator: true,
        },
      }
    );
    if (
      !account.agent ||
      !account.space ||
      !account.space.community ||
      !account.space.community.policy ||
      !account.library ||
      !account.license ||
      !account.defaults ||
      !account.virtualContributors ||
      !account.storageAggregator
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const hostCredentials = await this.accountHostService.getHostCredentials(
      account
    );

    // Ensure always applying from a clean state
    account.authorization = this.authorizationPolicyService.reset(
      account.authorization
    );
    account.authorization.anonymousReadAccess = false;
    account.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        account.authorization
      );

    // For now also use the root space admins to have some access
    const communityPolicyWithSettings =
      this.spaceAuthorizationService.getCommunityPolicyWithSettings(
        account.space
      );
    account.authorization = this.extendAuthorizationPolicy(
      account.authorization,
      hostCredentials
    );
    account.authorization = this.appendPrivilegeRules(account.authorization);

    account.agent = this.agentAuthorizationService.applyAuthorizationPolicy(
      account.agent,
      account.authorization
    );

    account.license = this.licenseAuthorizationService.applyAuthorizationPolicy(
      account.license,
      account.authorization
    );

    let clonedAccountAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        account.authorization
      );
    clonedAccountAuth = this.extendAuthorizationPolicyForChildEntities(
      clonedAccountAuth,
      communityPolicyWithSettings,
      hostCredentials
    );

    // For certain child entities allow the space admin also pretty much full control
    account.library =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        account.library,
        clonedAccountAuth
      );

    account.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        account.storageAggregator,
        account.authorization
      );

    account.defaults.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        account.defaults.authorization,
        clonedAccountAuth
      );

    const updatedVCs: IVirtualContributor[] = [];
    for (const vc of account.virtualContributors) {
      const udpatedVC =
        await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
          vc,
          clonedAccountAuth
        );
      updatedVCs.push(udpatedVC);
    }
    account.virtualContributors = updatedVCs;

    // Need to save as there is still a circular dependency from space auth to account auth reset
    const savedAccount = await this.accountService.save(account);

    // And cascade into the space if there is one
    if (!account.space) {
      throw new RelationshipNotFoundException(
        `No space on account for resetting: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    savedAccount.space =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        account.space
      );

    return savedAccount;
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    hostCredentials: ICredentialDefinition[]
  ): IAuthorizationPolicy {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible. TODO: work through the logic on this
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization, manage platform settings
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.AUTHORIZATION_RESET,
          AuthorizationPrivilege.PLATFORM_ADMIN,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    // Allow Global Spaces Read to view Spaces + contents
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
      );
    newRules.push(globalSpacesReader);

    // Allow hosts (users = self mgmt, org = org admin) to manage their own account
    const userHostsRule = this.authorizationPolicyService.createCredentialRule(
      [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
      [...hostCredentials],
      CREDENTIAL_RULE_TYPES_ACCOUNT_MANAGE
    );
    userHostsRule.cascade = false;
    newRules.push(userHostsRule);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private extendAuthorizationPolicyForChildEntities(
    authorization: IAuthorizationPolicy | undefined,
    communityPolicyWithSettings: ICommunityPolicy,
    hostCredentials: ICredentialDefinition[]
  ): IAuthorizationPolicy {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // If there is a root space, then also allow the admins to manage the account for now
    const accountChildEntitiesManage = hostCredentials;
    const spaceAdminCriterias =
      this.communityPolicyService.getCredentialsForRole(
        communityPolicyWithSettings,
        CommunityRole.ADMIN
      );
    accountChildEntitiesManage.push(...spaceAdminCriterias);
    if (accountChildEntitiesManage.length !== 0) {
      const spaceAdmin = this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        accountChildEntitiesManage,
        CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES
      );
      newRules.push(spaceAdmin);
    }
    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private appendPrivilegeRules(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const createVcPrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_VIRTUAL_CONTRIBUTOR],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_ACCOUNT_CREATE_VC
    );
    privilegeRules.push(createVcPrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }
}
