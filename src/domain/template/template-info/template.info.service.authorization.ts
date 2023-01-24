import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { ITemplateInfo } from './template.info.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { TemplateInfo } from './template.info.entity';
import { Repository } from 'typeorm';
import { TemplateInfoService } from './template.info.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';

@Injectable()
export class TemplateInfoAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplateInfo)
    private templateInfoRepository: Repository<TemplateInfo>,
    private templateInfoService: TemplateInfoService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    templateInfo: ITemplateInfo,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<ITemplateInfo> {
    try {
      templateInfo.visual = await this.templateInfoService.getVisual(
        templateInfo
      );
    } catch (error) {
      this.logger.warn?.(
        `Authentication Info: Unable to retrieve visual for templateInfo: ${templateInfo.id}`,
        LogContext.AUTH
      );
    }
    if (templateInfo.visual)
      templateInfo.visual.authorization =
        this.authorizationPolicyService.inheritParentAuthorization(
          templateInfo.visual.authorization,
          parentAuthorization
        );

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
