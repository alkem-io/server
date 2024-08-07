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
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { AccountHostService } from '../account.host/account.host.service';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { POLICY_RULE_ACCOUNT_CREATE_VC } from '@common/constants/authorization/policy.rule.constants';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';

@Injectable()
export class AccountAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private accountService: AccountService,
    private accountHostService: AccountHostService
  ) {}

  async applyAuthorizationPolicy(accountInput: IAccount): Promise<IAccount> {
    let account = await this.accountService.getAccountOrFail(accountInput.id, {
      relations: {
        agent: true,
        spaces: true,
        virtualContributors: true,
        innovationPacks: true,
        innovationHubs: true,
        storageAggregator: true,
      },
    });
    if (!account.storageAggregator) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    // Ensure always applying from a clean state
    account.authorization = this.authorizationPolicyService.reset(
      account.authorization
    );
    account.authorization.anonymousReadAccess = false;
    account.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        account.authorization
      );

    account.authorization = await this.extendAuthorizationPolicy(
      account,
      account.authorization
    );
    account.authorization = this.appendPrivilegeRules(account.authorization);

    account = await this.applyAuthorizationPolicyForChildEntities(account);

    // Need to save as there is still a circular dependency from space auth to account auth reset
    const savedAccount = await this.accountService.save(account);

    // And cascade into the space if there is one
    for (const space of account.spaces) {
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    }

    return savedAccount;
  }
  public async getClonedAccountAuthExtendedForChildEntities(
    account: IAccount
  ): Promise<IAuthorizationPolicy> {
    let clonedAccountAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        account.authorization
      );

    const hostCredentials =
      await this.accountHostService.getHostCredentials(account);

    clonedAccountAuth = this.extendAuthorizationPolicyForChildEntities(
      clonedAccountAuth,
      hostCredentials
    );
    return clonedAccountAuth;
  }

  public async applyAuthorizationPolicyForChildEntities(
    account: IAccount
  ): Promise<IAccount> {
    if (
      !account.agent ||
      !account.virtualContributors ||
      !account.innovationPacks ||
      !account.storageAggregator ||
      !account.innovationHubs
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    const clonedAccountAuth =
      await this.getClonedAccountAuthExtendedForChildEntities(account);

    account.agent = this.agentAuthorizationService.applyAuthorizationPolicy(
      account.agent,
      account.authorization
    );

    account.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        account.storageAggregator,
        account.authorization
      );

    const updatedVCs: IVirtualContributor[] = [];
    for (const vc of account.virtualContributors) {
      const updatedVC =
        await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
          vc,
          clonedAccountAuth
        );
      updatedVCs.push(updatedVC);
    }
    account.virtualContributors = updatedVCs;

    const updatedIPs: IInnovationPack[] = [];
    for (const ip of account.innovationPacks) {
      const updatedIP =
        await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
          ip,
          clonedAccountAuth
        );
      updatedIPs.push(updatedIP);
    }
    account.innovationPacks = updatedIPs;

    const updatedInnovationHubs: IInnovationHub[] = [];
    for (const innovationHub of account.innovationHubs) {
      const updatedInnovationHub =
        await this.innovationHubAuthorizationService.applyAuthorizationPolicyAndSave(
          innovationHub,
          clonedAccountAuth
        );
      updatedInnovationHubs.push(updatedInnovationHub);
    }
    account.innovationHubs = updatedInnovationHubs;
    return account;
  }

  private async extendAuthorizationPolicy(
    account: IAccount,
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }

    const hostCredentials =
      await this.accountHostService.getHostCredentials(account);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible. TODO: work through the logic on this
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization, manage platform settings
    // and transfer resources
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.AUTHORIZATION_RESET,
          AuthorizationPrivilege.PLATFORM_ADMIN,
          AuthorizationPrivilege.TRANSFER_RESOURCE,
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
        //AuthorizationPrivilege.TRANSFER_RESOURCE // Assign later once stable
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

    if (accountChildEntitiesManage.length !== 0) {
      const accountChildEntities =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.GRANT,
          ],
          accountChildEntitiesManage,
          CREDENTIAL_RULE_TYPES_ACCOUNT_CHILD_ENTITIES
        );
      newRules.push(accountChildEntities);
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
