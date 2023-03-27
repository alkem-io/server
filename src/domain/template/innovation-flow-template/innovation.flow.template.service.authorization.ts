import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InnovationFlowTemplate } from './innovation.flow.template.entity';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class InnovationFlowTemplateAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(InnovationFlowTemplate)
    private innovationFlowTemplateRepository: Repository<InnovationFlowTemplate>,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    innovationFlowTemplate: IInnovationFlowTemplate,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IInnovationFlowTemplate> {
    // Inherit from the parent
    innovationFlowTemplate.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        innovationFlowTemplate.authorization,
        parentAuthorization
      );

    innovationFlowTemplate.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        innovationFlowTemplate.profile,
        innovationFlowTemplate.authorization
      );

    return await this.innovationFlowTemplateRepository.save(
      innovationFlowTemplate
    );
  }
}
