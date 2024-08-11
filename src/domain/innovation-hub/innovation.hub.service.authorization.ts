import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IInnovationHub } from './types';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CREDENTIAL_RULE_TYPES_INNOVATION_HUBS } from '@common/constants/authorization/credential.rule.types.constants';
import { InnovationHubService } from './innovation.hub.service';

@Injectable()
export class InnovationHubAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private innovationHubService: InnovationHubService
  ) {}

  public async applyAuthorizationPolicyAndSave(
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
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        parentAuthorization
      );
    clonedAuthorization.anonymousReadAccess = true;

    hub.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        hub.authorization,
        clonedAuthorization
      );

    hub.authorization = this.extendAuthorizationPolicyRules(hub.authorization);
    updatedAuthorizations.push(hub.authorization);

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        hub.profile,
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
