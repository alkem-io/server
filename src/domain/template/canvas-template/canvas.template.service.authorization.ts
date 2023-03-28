import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CanvasTemplate } from './canvas.template.entity';
import { ICanvasTemplate } from './canvas.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class CanvasTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(CanvasTemplate)
    private canvasTemplateRepository: Repository<CanvasTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
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
    canvasTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        canvasTemplate.profile,
        canvasTemplate.authorization
      );

    return await this.canvasTemplateRepository.save(canvasTemplate);
  }
}
