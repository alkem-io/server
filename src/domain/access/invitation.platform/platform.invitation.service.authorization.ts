import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Injectable } from '@nestjs/common';
import { IPlatformInvitation } from './platform.invitation.interface';

@Injectable()
export class PlatformInvitationAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    platformInvitation: IPlatformInvitation,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    const updatedPlatformAuthorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        platformInvitation.authorization,
        parentAuthorization
      );

    return updatedPlatformAuthorization;
  }
}
