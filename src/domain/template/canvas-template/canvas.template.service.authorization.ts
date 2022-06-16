import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CanvasTemplate } from './canvas.template.entity';
import { ICanvasTemplate } from './canvas.template.interface';
import { TemplateInfoAuthorizationService } from '../template-info/template.info.service.authorization';

@Injectable()
export class CanvasTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(CanvasTemplate)
    private canvasTemplateRepository: Repository<CanvasTemplate>,
    private templateInfoAuthorizationService: TemplateInfoAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    canvasTemplate: ICanvasTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ICanvasTemplate> {
    // Inherit from the parent
    canvasTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        canvasTemplate.authorization,
        parentAuthorization
      );
    // Cascade
    if (canvasTemplate.templateInfo) {
      canvasTemplate.templateInfo =
        await this.templateInfoAuthorizationService.applyAuthorizationPolicy(
          canvasTemplate.templateInfo,
          canvasTemplate.authorization
        );
    }

    return await this.canvasTemplateRepository.save(canvasTemplate);
  }
}
