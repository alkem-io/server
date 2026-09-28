import {
  CREDENTIAL_RULE_ORGANIZATION_VERIFICATION_ADMIN,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS_ALL,
  CREDENTIAL_RULE_TYPES_ORGANIZATION_VERIFICATION_PLATFORM_SUPPORT,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { IOrganizationVerification } from './organization.verification.interface';

@Injectable()
export class OrganizationVerificationAuthorizationService {
  constructor(
    private authorizationPolicy: AuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async applyAuthorizationPolicy(
    organizationVerification: IOrganizationVerification,
    organizationAccountID: string
  ): Promise<IAuthorizationPolicy> {
    organizationVerification.authorization =
      this.authorizationPolicyService.reset(
        organizationVerification.authorization
      );
    organizationVerification.authorization = this.appendCredentialRules(
      organizationVerification.authorization,
      organizationVerification.id,
      organizationAccountID
    );

    return organizationVerification.authorization;
  }

  private appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined,
    organizationVerificationID: string,
    organizationAccountID: string
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for organization verification: ${organizationVerificationID}`,
        LogContext.COMMUNITY
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const globalAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_COMMUNITY_READ,
        ],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_GLOBAL_ADMINS_ALL
      );
    // Slice B: GLOBAL_COMMUNITY_READ is a READ role that holds GRANT here —
    // flagged for removal with the rest of this legacy rule (QA server-C2-d).
    newRules.push(globalAdmin);

    // QA server-C2-d (ruling (a), A6 organization lifecycle): Platform
    // Support approves / resets / reopens / archives an organization's
    // verification. UPDATE passes the resolver's gate
    // (`organization.verification.resolver.mutations.ts`), GRANT passes the
    // MANUALLY_VERIFY / RESET / REOPEN / ARCHIVE lifecycle guards
    // (`organization.verification.service.lifecycle.ts`), READ lets it see
    // the state it acts on. Never CREATE/DELETE. Additive in Slice A — the
    // legacy rule above is untouched. The client's verify toggle keys on
    // Update && Grant, so it appears for Support with no client change.
    const platformSupport =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
        ],
        [AuthorizationCredential.PLATFORM_SUPPORT],
        CREDENTIAL_RULE_TYPES_ORGANIZATION_VERIFICATION_PLATFORM_SUPPORT
      );
    platformSupport.cascade = false;
    newRules.push(platformSupport);

    const orgAdmin = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ, AuthorizationPrivilege.UPDATE],
      [
        {
          type: AuthorizationCredential.ACCOUNT_ADMIN,
          resourceID: organizationAccountID,
        },
      ],
      CREDENTIAL_RULE_ORGANIZATION_VERIFICATION_ADMIN
    );
    newRules.push(orgAdmin);

    const updatedAuthorization =
      this.authorizationPolicy.appendCredentialAuthorizationRules(
        authorization,
        newRules
      );

    return updatedAuthorization;
  }
}
