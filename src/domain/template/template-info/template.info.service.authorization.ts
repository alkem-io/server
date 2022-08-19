import { Injectable } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ITemplateInfo } from './template.info.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { TemplateInfo } from './template.info.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TemplateInfoAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplateInfo)
    private templateInfoRepository: Repository<TemplateInfo>
  ) {}

  async applyAuthorizationPolicy(
    templateInfo: ITemplateInfo,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplateInfo> {
    //hack because relationship because of auth service and domain service should not exist
    //and due to typeorm limitation eager loading of visual was removed
    const templateInfoWithVisual = await this.templateInfoRepository.findOne(
      { id: templateInfo.id },
      {
        relations: ['visual'],
      }
    );
    templateInfo.visual = templateInfoWithVisual?.visual;

    if (templateInfo.visual) {
      templateInfo.visual.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          templateInfo.visual.authorization,
          parentAuthorization
        );
    }

    if (templateInfo.tagset) {
      templateInfo.tagset.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          templateInfo.tagset.authorization,
          parentAuthorization
        );
    }

    return await this.templateInfoRepository.save(templateInfo);
  }
}
