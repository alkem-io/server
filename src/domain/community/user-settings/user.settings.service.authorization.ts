import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { IUserSettings } from './user.settings.interface';

@Injectable()
export class UserSettingsAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  applyAuthorizationPolicy(
    userSettings: IUserSettings,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    userSettings.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        userSettings.authorization,
        parentAuthorization
      );

    return userSettings.authorization;
  }
}
