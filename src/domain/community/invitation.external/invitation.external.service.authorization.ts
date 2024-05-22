import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IInvitationExternal } from './invitation.external.interface';

@Injectable()
export class InvitationExternalAuthorizationService {
  constructor(private authorizationPolicyService: AuthorizationPolicyService) {}

  async applyAuthorizationPolicy(
    invitationExternal: IInvitationExternal,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInvitationExternal> {
    invitationExternal.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        invitationExternal.authorization,
        parentAuthorization
      );

    return invitationExternal;
  }
}
