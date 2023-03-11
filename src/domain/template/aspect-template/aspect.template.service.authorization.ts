import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AspectTemplate } from './aspect.template.entity';
import { IAspectTemplate } from './aspect.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class AspectTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(AspectTemplate)
    private aspectTemplateRepository: Repository<AspectTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    aspectTemplate: IAspectTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IAspectTemplate> {
    // Inherit from the parent
    aspectTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        aspectTemplate.authorization,
        parentAuthorization
      );
    // Cascade
    aspectTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        aspectTemplate.profile,
        aspectTemplate.authorization
      );

    return await this.aspectTemplateRepository.save(aspectTemplate);
  }
}
