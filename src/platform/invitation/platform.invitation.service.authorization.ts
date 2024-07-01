import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IPlatformInvitation } from './platform.invitation.interface';

@Injectable()
export class PlatformInvitationAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    platformInvitation: IPlatformInvitation,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IPlatformInvitation> {
    platformInvitation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        platformInvitation.authorization,
        parentAuthorization
      );

    return platformInvitation;
  }
}
