import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { Repository } from 'typeorm';
import { AccountService } from './account.service';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAccount } from './account.interface';
import { Account } from './account.entity';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { LicenseAuthorizationService } from '@domain/license/license/license.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import {
  CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET,
  CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS,
  CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_GLOBAL_ADMIN_GRANT,
  CREDENTIAL_RULE_TYPES_SPACE_GLOBAL_ADMIN_COMMUNITY_READ,
} from '@common/constants/authorization/credential.rule.types.constants';

@Injectable()
export class AccountAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private accountService: AccountService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>
  ) {}

  async applyAuthorizationPolicy(accountInput: IAccount): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      accountInput.id,
      {
        relations: {
          license: true,
          library: true,
          defaults: true,
          space: {
            profile: true,
          },
        },
      }
    );
    if (
      !account.library ||
      !account.license ||
      !account.defaults ||
      !account.space ||
      !account.space.profile
    )
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.ACCOUNT
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
    // Extend for global roles
    account.authorization = this.extendAuthorizationPolicyGlobal(
      account.authorization,
      account.id
    );

    account.license =
      await this.licenseAuthorizationService.applyAuthorizationPolicy(
        account.license,
        account.authorization
      );

    account.space =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        account.space
      );

    // Library and defaults are inherited from the space
    let spaceAuthorization = account.space.authorization;
    spaceAuthorization = this.extendSpaceAuthorizationPolicyGlobal(
      spaceAuthorization,
      account.space.id
    );
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

    return await this.accountRepository.save(account);
  }

  private extendAuthorizationPolicyGlobal(
    authorization: IAuthorizationPolicy | undefined,
    accountID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${accountID}`,
        LogContext.ACCOUNT
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    // Allow global admins to reset authorization
    const authorizationReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.AUTHORIZATION_RESET,
          AuthorizationPrivilege.PLATFORM_ADMIN,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_ACCOUNT_AUTHORIZATION_RESET
      );
    authorizationReset.cascade = false;
    newRules.push(authorizationReset);

    const communityAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_ADMIN_COMMUNITY],
        CREDENTIAL_RULE_TYPES_SPACE_GLOBAL_ADMIN_COMMUNITY_READ
      );
    newRules.push(communityAdmin);

    // Allow Global admins + Global Space Admins to manage access to Spaces + contents
    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_AUTHORIZATION_GLOBAL_ADMIN_GRANT
      );
    newRules.push(globalAdmin);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private extendSpaceAuthorizationPolicyGlobal(
    authorization: IAuthorizationPolicy | undefined,
    spaceID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${spaceID}`,
        LogContext.ACCOUNT
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalAdmins =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
          AuthorizationPrivilege.GRANT,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN_SPACES,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    newRules.push(globalAdmins);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
