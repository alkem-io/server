import { CREDENTIAL_RULE_TYPES_INNOVATION_HUBS } from '@common/constants/authorization/credential.rule.types.constants';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
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
        with: {
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

    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    const innovationHubAdmins =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ],
        CREDENTIAL_RULE_TYPES_INNOVATION_HUBS
      );
    innovationHubAdmins.cascade = true;
    newRules.push(innovationHubAdmins);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      hubAuthorization,
      newRules
    );

    return hubAuthorization;
  }
}
