import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalloutTemplate } from './callout.template.entity';
import { ICalloutTemplate } from './callout.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CalloutTemplateService } from './callout.template.service';
import { CalloutFramingAuthorizationService } from '@domain/collaboration/callout-framing/callout.framing.service.authorization';

@Injectable()
export class CalloutTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(CalloutTemplate)
    private calloutTemplateRepository: Repository<CalloutTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService,
    private calloutFramingAuthorizationService: CalloutFramingAuthorizationService,
    private calloutTemplateService: CalloutTemplateService
  ) {}

  async applyAuthorizationPolicy(
    calloutTemplateInput: ICalloutTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICalloutTemplate> {
    const calloutTemplate =
      await this.calloutTemplateService.getCalloutTemplateOrFail(
        calloutTemplateInput.id,
        {
          relations: {
            profile: true,
            framing: true,
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

    // Cascade
    calloutTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        calloutTemplate.profile,
        calloutTemplate.authorization
      );

    calloutTemplate.framing =
      await this.calloutFramingAuthorizationService.applyAuthorizationPolicy(
        calloutTemplate.framing,
        parentAuthorization
      );

    return this.calloutTemplateRepository.save(calloutTemplate);
  }
}
