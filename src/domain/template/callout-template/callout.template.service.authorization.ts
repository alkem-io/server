import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ICalloutTemplate } from './callout.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutTemplateService } from './callout.template.service';
import { CalloutFramingAuthorizationService } from '@domain/collaboration/callout-framing/callout.framing.service.authorization';

@Injectable()
export class CalloutTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private calloutFramingAuthorizationService: CalloutFramingAuthorizationService,
    private calloutTemplateService: CalloutTemplateService
  ) {}

  async applyAuthorizationPolicy(
    calloutTemplateInput: ICalloutTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const calloutTemplate =
      await this.calloutTemplateService.getCalloutTemplateOrFail(
        calloutTemplateInput.id,
        {
          relations: {
            profile: true,
            framing: {
              profile: true,
              whiteboard: {
                profile: true,
              },
            },
            contributionPolicy: true,
            contributionDefaults: true,
          },
        }
      );
    // Inherit from the parent
    calloutTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        calloutTemplate.authorization,
        parentAuthorization
      );
    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    // Cascade
    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calloutTemplate.profile,
        calloutTemplate.authorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const framingAuthorizations =
      await this.calloutFramingAuthorizationService.applyAuthorizationPolicy(
        calloutTemplate.framing,
        parentAuthorization
      );
    updatedAuthorizations.push(...framingAuthorizations);

    return updatedAuthorizations;
  }
}
