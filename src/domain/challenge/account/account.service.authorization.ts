import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AccountService } from './account.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAccount } from './account.interface';
import { Account } from './account.entity';
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';
import { LicenseAuthorizationService } from '@domain/license/license/license.service.authorization';

@Injectable()
export class AccountAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    private accountService: AccountService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>
  ) {}

  async applyAuthorizationPolicy(
    accountInput: IAccount,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      accountInput.id,
      {
        relations: {
          license: true,
          library: true,
          defaults: true,
        },
      }
    );
    if (!account.library || !account.license || !account.defaults)
      throw new RelationshipNotFoundException(
        `Unable to load Account with entities at start of auth reset: ${account.id} `,
        LogContext.CHALLENGES
      );

    // Ensure always applying from a clean state
    account.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        account.authorization,
        parentAuthorization
      );

    account.license =
      await this.licenseAuthorizationService.applyAuthorizationPolicy(
        account.license,
        account.authorization
      );

    account.library =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        account.library,
        account.authorization
      );

    account.defaults.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        account.defaults.authorization,
        account.authorization
      );

    return await this.accountRepository.save(account);
  }
}
