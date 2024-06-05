import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AccountService } from './account.service';
import {
  AccountException,
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
  CREDENTIAL_RULE_ACCOUNT_CREATE_VIRTUAL_CONTRIBUTOR,
  CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_ACCOUNT_DELETE,
  CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_GLOBAL_ADMIN_GRANT,
  CREDENTIAL_RULE_TYPES_SPACE_GLOBAL_ADMIN_COMMUNITY_READ,
  CREDENTIAL_RULE_TYPES_SPACE_READ,
} from '@common/constants/authorization/credential.rule.types.constants';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';

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
    private accountService: AccountService
  ) {}

  async applyAuthorizationPolicy(accountInput: IAccount): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      accountInput.id,
      {
        relations: {
          agent: true,
          space: {
            profile: true,
          },
          license: true,
          library: true,
          defaults: true,
          virtualContributors: true,
        },
      }
    );
    if (
      !account.agent ||
      !account.library ||
      !account.license ||
      !account.defaults ||
      !account.space ||
      !account.space.profile ||
      !account.virtualContributors
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const host = await this.accountService.getHostOrFail(account);

    // Ensure always applying from a clean state
    account.authorization = this.authorizationPolicyService.reset(
      account.authorization
    );
    account.authorization.anonymousReadAccess = false;
    account.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        account.authorization
      );
    // Extend for global roles
    account.authorization = this.extendAuthorizationPolicy(
      account.authorization,
      account.id,
      host
    );

    account.agent = this.agentAuthorizationService.applyAuthorizationPolicy(
      account.agent,
      account.authorization
    );

    account.license = this.licenseAuthorizationService.applyAuthorizationPolicy(
      account.license,
      account.authorization
    );

    account.space =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        account.space
      );

    // Library and defaults are inherited from the space
    const spaceAuthorization = account.space.authorization;
    account.library =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        account.library,
        spaceAuthorization
      );

    account.defaults.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        account.defaults.authorization,
        spaceAuthorization
      );

    const updatedVCs: IVirtualContributor[] = [];
    for (const vc of account.virtualContributors) {
      const udpatedVC =
        await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
          vc,
          spaceAuthorization
        );
      updatedVCs.push(udpatedVC);
    }
    account.virtualContributors = updatedVCs;

    return await this.accountService.save(account);
  }

  private extendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined,
    accountID: string,
    host: IContributor
  ): IAuthorizationPolicy {
    if (!authorization) {
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${accountID}`,
        LogContext.ACCOUNT
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible
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

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_COMMUNITY_READ],
        CREDENTIAL_RULE_TYPES_SPACE_GLOBAL_ADMIN_COMMUNITY_READ
      );
    newRules.push(communityAdmin);

    // Allow Global admins to manage access to Spaces + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_GLOBAL_ADMIN_GRANT
      );
    newRules.push(globalAdmin);

    // Allow Global Spaces Read to view Spaces + contents
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_SPACE_READ
      );
    newRules.push(globalSpacesReader);

    // Create the criterias for who can create a VC
    const createVCsCriterias: ICredentialDefinition[] = [];
    createVCsCriterias.push({
      type: AuthorizationCredential.GLOBAL_ADMIN,
      resourceID: '',
    });
    createVCsCriterias.push({
      type: AuthorizationCredential.GLOBAL_SUPPORT,
      resourceID: '',
    });
    const accountHostCred = this.createCredentialCriteriaForHost(host);
    createVCsCriterias.push(accountHostCred);

    const createVC = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.CREATE_VIRTUAL_CONTRIBUTOR],
      createVCsCriterias,
      CREDENTIAL_RULE_ACCOUNT_CREATE_VIRTUAL_CONTRIBUTOR
    );
    createVC.cascade = false;
    newRules.push(createVC);

    // Allow hosts (users = self mgmt, org = org admin) to delete their own account
    const userHostsRule = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.DELETE],
      [accountHostCred],
      CREDENTIAL_RULE_TYPES_ACCOUNT_DELETE
    );
    userHostsRule.cascade = false;
    newRules.push(userHostsRule);

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
