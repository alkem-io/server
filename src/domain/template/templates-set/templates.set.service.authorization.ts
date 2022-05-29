import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSetService } from './templates.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from '.';
import { AspectTemplate } from '../aspect-template/aspect.template.entity';
import { TemplateBaseAuthorizationService } from '../template-base/template.base.service.authorization';

@Injectable()
export class TemplatesSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    @InjectRepository(AspectTemplate)
    private aspectTemplateRepository: Repository<AspectTemplate>,
    private templateBaseAuthorizationService: TemplateBaseAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    templatesSetInput: ITemplatesSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplatesSet> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templatesSetInput.id,
      {
        relations: ['aspectTemplates'],
      }
    );

    // Inherit from the parent
    templatesSet.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        templatesSet.authorization,
        parentAuthorization
      );

    if (templatesSet.aspectTemplates) {
      for (const aspectTemplate of templatesSet.aspectTemplates) {
        await this.templateBaseAuthorizationService.applyAuthorizationPolicy(
          aspectTemplate,
          this.aspectTemplateRepository,
          parentAuthorization
        );
      }
    }

    return await this.templatesSetRepository.save(templatesSet);
  }
}
