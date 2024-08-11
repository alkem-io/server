import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IWhiteboardTemplate } from './whiteboard.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class WhiteboardTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    whiteboardTemplate: IWhiteboardTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Inherit from the parent
    whiteboardTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        whiteboardTemplate.authorization,
        parentAuthorization
      );
    updatedAuthorizations.push(whiteboardTemplate.authorization);
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        whiteboardTemplate.profile,
        whiteboardTemplate.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    return updatedAuthorizations;
  }
}
