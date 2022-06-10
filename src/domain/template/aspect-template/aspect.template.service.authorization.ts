import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AspectTemplate } from './aspect.template.entity';
import { IAspectTemplate } from './aspect.template.interface';
import { TemplateInfoAuthorizationService } from '../template-info/template.info.service.authorization';

@Injectable()
export class AspectTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(AspectTemplate)
    private aspectTemplateRepository: Repository<AspectTemplate>,
    private templateInfoAuthorizationService: TemplateInfoAuthorizationService
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
    if (aspectTemplate.templateInfo) {
      aspectTemplate.templateInfo =
        await this.templateInfoAuthorizationService.applyAuthorizationPolicy(
          aspectTemplate.templateInfo,
          aspectTemplate.authorization
        );
    }

    return await this.aspectTemplateRepository.save(aspectTemplate);
  }
}
