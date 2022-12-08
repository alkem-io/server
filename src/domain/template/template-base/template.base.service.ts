import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateInfoService } from '../template-info/template.info.service';
import { CreateTemplateBaseInput } from './dto/template.base.dto.create';
import { UpdateTemplateBaseInput } from './dto/template.base.dto.update';
import { ITemplateBase } from './template.base.interface';

@Injectable()
export class TemplateBaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,

    private templateInfoService: TemplateInfoService
  ) {}

  async initialise(
    baseTemplate: ITemplateBase,
    baseTemplateData: CreateTemplateBaseInput
  ): Promise<ITemplateBase> {
    baseTemplate.authorization = new AuthorizationPolicy();

    baseTemplate.templateInfo =
      await this.templateInfoService.createTemplateInfo(baseTemplateData.info);

    return baseTemplate;
  }

  async updateTemplateBase(
    baseTemplate: ITemplateBase,
    baseTemplateData: UpdateTemplateBaseInput
  ): Promise<ITemplateBase> {
    if (!baseTemplate.templateInfo) {
      throw new EntityNotFoundException(
        `No templateInfo found on template  with id: ${baseTemplate.id}`,
        LogContext.TEMPLATES
      );
    }
    if (baseTemplateData.info) {
      baseTemplate.templateInfo =
        await this.templateInfoService.updateTemplateInfo(
          baseTemplate.templateInfo,
          baseTemplateData.info
        );
    }

    return baseTemplate;
  }

  async deleteEntities(baseTemplate: ITemplateBase) {
    if (baseTemplate.templateInfo) {
      await this.templateInfoService.delete(baseTemplate.templateInfo.id);
    }
  }
}
