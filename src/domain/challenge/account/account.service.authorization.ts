import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AccountService } from './account.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAccount } from './account.interface';
import { Account } from './account.entity';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { LicenseAuthorizationService } from '@domain/license/license/license.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SpaceAuthorizationService } from '../space/space.service.authorization';

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
          space: true,
        },
      }
    );
    if (
      !account.library ||
      !account.license ||
      !account.defaults ||
      !account.space
    )
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.CHALLENGES
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

    account.license =
      await this.licenseAuthorizationService.applyAuthorizationPolicy(
        account.license,
        account.authorization
      );

    account.space =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(
        account.space,
        account.authorization
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

    return await this.accountRepository.save(account);
  }
}
