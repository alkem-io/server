import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { IInnovationHub, InnovationHub } from './types';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CREDENTIAL_RULE_TYPES_INNOVATION_HUBS } from '@common/constants/authorization/credential.rule.types.constants';

@Injectable()
export class InnovationHubAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    @InjectRepository(InnovationHub)
    private spaceRepository: Repository<InnovationHub>
  ) {}

  public async applyAuthorizationPolicyAndSave(
    hub: IInnovationHub
  ): Promise<IInnovationHub> {
    hub.authorization = this.authorizationPolicyService.reset(
      hub.authorization
    );
    hub.authorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        hub.authorization
      );
    hub.authorization.anonymousReadAccess = true;
    hub.authorization = this.extendAuthorizationPolicyRules(hub.authorization);

    hub = await this.cascadeAuthorization(hub);

    return this.spaceRepository.save(hub);
  }

  private async cascadeAuthorization(
    innovationHub: IInnovationHub
  ): Promise<IInnovationHub> {
    if (innovationHub.profile) {
      innovationHub.profile =
        await this.profileAuthorizationService.applyAuthorizationPolicy(
          innovationHub.profile,
          innovationHub.authorization
        );
    }

    return innovationHub;
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
