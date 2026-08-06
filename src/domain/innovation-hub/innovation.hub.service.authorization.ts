import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { Injectable } from '@nestjs/common';
import { InnovationHubService } from './innovation.hub.service';
import { IInnovationHub } from './types';

@Injectable()
export class InnovationHubAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private innovationHubService: InnovationHubService
  ) {}

  public async applyAuthorizationPolicy(
    hubInput: IInnovationHub,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const hub = await this.innovationHubService.getInnovationHubOrFail(
      hubInput.id,
      {
        relations: {
          profile: true,
        },
      }
    );

    if (!hub.profile) {
      throw new EntityNotInitializedException(
        `authorization: Unable to load InnovationHub entities for auth reset: ${hubInput.id}`,
        LogContext.INNOVATION_HUB
      );
    }
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Clone the authorization policy + allow anonymous read access to ensure
    // pages are visible / loadable by all users
    let clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        parentAuthorization
      );
    clonedAuthorization =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        clonedAuthorization,
        AuthorizationPrivilege.READ
      );

    hub.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        hub.authorization,
        clonedAuthorization
      );

    hub.authorization = this.extendAuthorizationPolicyRules(hub.authorization);
    updatedAuthorizations.push(hub.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        hub.profile.id,
        hub.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }

  private extendAuthorizationPolicyRules(
    hubAuthorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    if (!hubAuthorization) {
      throw new EntityNotInitializedException(
        'Authorization policy is not initialized on InnovationHub',
        LogContext.INNOVATION_HUB
      );
    }

    // 027-platform-role-redesign (T076, Slice B): the blanket CRUD rule for
    // `{global-admin, global-support}` is DELETED rather than re-anchored. An
    // innovation hub is platform content, and Content Full Access already
    // reaches it with cascading CRUD from the inheritance root (FR-004) — so
    // re-pointing this rule at the same role would grant it twice and make the
    // second grant invisible to `privilege.grants.ts`. Support's own reach over
    // an ORGANIZATION's hubs is A7's `PLATFORM_SUPPORT_ORG_RESOURCES`, granted
    // on the account tree, not here.
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      hubAuthorization,
      newRules
    );

    return hubAuthorization;
  }
}
