import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSetService } from './templates.set.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from '.';
import { CanvasTemplateAuthorizationService } from '../canvas-template/canvas.template.service.authorization';
import { AspectTemplateAuthorizationService } from '../aspect-template/aspect.template.service.authorization';
import { LifecycleTemplateAuthorizationService } from '../lifecycle-template/lifecycle.template.service.authorization';

@Injectable()
export class TemplatesSetAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private aspectTemplateAuthorizationService: AspectTemplateAuthorizationService,
    private canvasTemplateAuthorizationService: CanvasTemplateAuthorizationService,
    private lifecycleTemplateAuthorizationService: LifecycleTemplateAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    templatesSetInput: ITemplatesSet,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplatesSet> {
    const templatesSet = await this.templatesSetService.getTemplatesSetOrFail(
      templatesSetInput.id,
      {
        relations: ['aspectTemplates', 'canvasTemplates', 'lifecycleTemplates'],
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
        await this.aspectTemplateAuthorizationService.applyAuthorizationPolicy(
          aspectTemplate,
          parentAuthorization
        );
      }
    }

    if (templatesSet.canvasTemplates) {
      for (const canvasTemplate of templatesSet.canvasTemplates) {
        await this.canvasTemplateAuthorizationService.applyAuthorizationPolicy(
          canvasTemplate,
          parentAuthorization
        );
      }
    }

    if (templatesSet.lifecycleTemplates) {
      for (const lifecycleTemplate of templatesSet.lifecycleTemplates) {
        await this.lifecycleTemplateAuthorizationService.applyAuthorizationPolicy(
          lifecycleTemplate,
          parentAuthorization
        );
      }
    }

    return await this.templatesSetRepository.save(templatesSet);
  }
}
