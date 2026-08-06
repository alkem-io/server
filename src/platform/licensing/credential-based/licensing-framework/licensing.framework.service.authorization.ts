import {
  CREDENTIAL_RULE_LICENSE_MANAGER,
  CREDENTIAL_RULE_LICENSE_PLAN_USAGE,
  CREDENTIAL_RULE_LICENSE_RESET,
} from '@common/constants/authorization/credential.rule.constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { LicensePolicyAuthorizationService } from '@platform/licensing/credential-based/license-policy/license.policy.service.authorization';
import { ILicensingFramework } from './licensing.framework.interface';
import { LicensingFrameworkService } from './licensing.framework.service';

@Injectable()
export class LicensingFrameworkAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licensePolicyAuthorizationService: LicensePolicyAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    licensingInput: ILicensingFramework,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    let licensing = licensingInput;
    if (!licensing.licensePolicy) {
      licensing = await this.licensingFrameworkService.getLicensingOrFail(
        licensingInput.id,
        {
          relations: {
            licensePolicy: true,
          },
        }
      );
    }

    if (!licensing.licensePolicy) {
      throw new RelationshipNotFoundException(
        `Unable to load entities for license manager auth: ${licensing.id} `,
        LogContext.LICENSE
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Ensure always applying from a clean state
    licensing.authorization = this.authorizationPolicyService.reset(
      licensing.authorization
    );
    licensing.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        licensing.authorization,
        parentAuthorization
      );
    // For now allow all registered users to see the license plans + policy
    licensing.authorization =
      this.authorizationPolicyService.appendCredentialRuleRegisteredAccess(
        licensing.authorization,
        AuthorizationPrivilege.READ
      );
    licensing.authorization = await this.appendCredentialRules(
      licensing.authorization
    );
    updatedAuthorizations.push(licensing.authorization);

    // Cascade down
    const policyAuthorization =
      this.licensePolicyAuthorizationService.applyAuthorizationPolicy(
        licensing.licensePolicy,
        licensing.authorization
      );
    updatedAuthorizations.push(policyAuthorization);

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for license manager',
        LogContext.LICENSE
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // 027-platform-role-redesign (T040, A13): plan/entitlement-mapping
    // DEFINITION is re-anchored onto platform-settings-admin, additively.
    // Distinct from A12 (license USAGE — assign/revoke plans, gated on
    // ACCOUNT_LICENSE_MANAGE/GRANT in account.service.authorization.ts, T037),
    // which stays with platform-license-manager.
    //
    // corr-server-13 fix: GRANT is deliberately ABSENT from this rule's
    // privilege list. It used to be included alongside CREATE/READ/UPDATE/
    // DELETE, which — because PLATFORM_SETTINGS_ADMIN is a member of this
    // rule's credential list — silently handed A12's GRANT privilege
    // (assign/revoke a license plan, admin.licensing.resolver.mutations.ts)
    // to Platform Settings Admin, a holder A12's own declared owner/legacy-
    // reacher lists (`A12_INTENDED_OWNERS`/`A12_LEGACY_REACHERS`) never
    // named. That mismatch meant a platform-settings-admin holder COULD
    // assign/revoke license plans, but every such call's audit-attribution
    // helper threw on the empty intersection and the row silently went
    // unwritten. GLOBAL_LICENSE_MANAGER/GLOBAL_PLATFORM_MANAGER's legacy
    // GRANT reach (which this rule used to also carry for them) moves to
    // `licensePlanUsage` below, alongside PLATFORM_LICENSE_MANAGER's owning
    // grant — the single rule A12 is actually declared against.
    const licensings =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
        CREDENTIAL_RULE_LICENSE_MANAGER
      );
    licensings.cascade = true;
    newRules.push(licensings);

    // 027-platform-role-redesign (T046, A12 usage): assign/revoke license
    // plan on an Account/Space (admin.licensing.resolver.mutations.ts) check
    // GRANT directly on THIS authorization — kept as a separate rule from
    // `licensings` above so platform-license-manager does NOT also acquire
    // A13's CRUD over plan/entitlement-mapping DEFINITIONS (which stays with
    // platform-settings-admin alone).
    //
    // corr-server-13 fix: GLOBAL_LICENSE_MANAGER/GLOBAL_PLATFORM_MANAGER
    // moved HERE from `licensings` above — that rule no longer carries
    // GRANT at all, so their pre-existing legacy A12 reach (declared in
    // `A12_LEGACY_REACHERS`) is preserved on the ONE rule A12 actually
    // gates, rather than leaking onto A13's DEFINITION rule too.
    // GLOBAL_ADMIN reaches GRANT here via the root cascade, unaffected by
    // this change.
    const licensePlanUsage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.GRANT],
        [AuthorizationCredential.PLATFORM_LICENSE_MANAGER],
        CREDENTIAL_RULE_LICENSE_PLAN_USAGE
      );
    licensePlanUsage.cascade = true;
    newRules.push(licensePlanUsage);

    // Bulk license reset (resetLicenseOnAccounts): the verified pre-feature
    // GRANT holders on this policy {GA (root cascading GRANT), GLM, GPM} plus
    // the Platform Operations Admin. GS never held GRANT here and gains
    // nothing.
    const licenseReset =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.LICENSE_RESET],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_LICENSE_RESET
      );
    licenseReset.cascade = false;
    newRules.push(licenseReset);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
