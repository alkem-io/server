import { CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS } from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class PlatformAuthorizationPolicyService {
  private readonly rootAuthorizationPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {
    this.rootAuthorizationPolicy = this.createRootAuthorizationPolicy();
  }

  public async getPlatformAuthorizationPolicy(): Promise<IAuthorizationPolicy> {
    const platform = await this.db.query.platforms.findFirst({
      with: {
        authorization: true,
      } as any,
    });

    if (!platform || !(platform as any).authorization) {
      throw new EntityNotFoundException(
        'No Platform authorization found!',
        LogContext.PLATFORM
      );
    }
    return (platform as any).authorization as IAuthorizationPolicy;
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
    const rootAuthorization = new AuthorizationPolicy(
      AuthorizationPolicyType.PLATFORM
    );

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
        [AuthorizationCredential.GLOBAL_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_GLOBAL_ADMINS
      );
    credentialRules.push(globalAdmins);

    return credentialRules;
  }
}
