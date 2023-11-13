import { Injectable } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS } from '@common/constants';
import { InjectRepository } from '@nestjs/typeorm';
import { Platform } from '@platform/platfrom/platform.entity';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';

@Injectable()
export class PlatformAuthorizationPolicyService {
  private readonly rootAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>
  ) {
    this.rootAuthorizationPolicy = this.createRootAuthorizationPolicy();
  }

  public async getPlatformAuthorizationPolicy(): Promise<IAuthorizationPolicy> {
    const platform = (
      await this.platformRepository.find({
        take: 1,
        relations: {
          authorization: true,
        },
      })
    )?.[0];

    if (!platform || !platform.authorization) {
      throw new EntityNotFoundException(
        'No Platform authorization found!',
        LogContext.PLATFORM
      );
    }
    return platform.authorization;
  }

  public inheritRootAuthorizationPolicy(
    childAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    return this.authorizationPolicyService.inheritParentAuthorization(
      childAuthorization,
      this.rootAuthorizationPolicy
    );
  }

  private createRootAuthorizationPolicy(): IAuthorizationPolicy {
    const rootAuthorization = new AuthorizationPolicy();

    const credentialRules = this.createRootCredentialRules();

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      rootAuthorization,
      credentialRules
    );
  }

  private createRootCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];
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
    credentialRules.push(globalAdmins);

    return credentialRules;
  }
}
