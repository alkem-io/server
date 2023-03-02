import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { VisualService } from '@domain/common/visual/visual.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateInfo } from './template.info.entity';
import { FindOneOptions, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTemplateInfoInput } from './dto/template.info.dto.create';
import { ITemplateInfo } from './template.info.interface';
import { UpdateTemplateInfoInput } from './dto/template.base.dto.update';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { IVisual } from '@domain/common/visual/visual.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';

@Injectable()
export class TemplateInfoService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(TemplateInfo)
    private templateInfoRepository: Repository<TemplateInfo>,
    private tagsetService: TagsetService,
    private visualService: VisualService
  ) {}

  async createTemplateInfo(
    templateInfoData: CreateTemplateInfoInput
  ): Promise<ITemplateInfo> {
    const templateInfo: ITemplateInfo = TemplateInfo.create(templateInfoData);
    templateInfo.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: templateInfoData.tags,
    });

    templateInfo.visual = await this.visualService.createVisualBannerNarrow(
      templateInfoData.visualUri
    );

    return await this.templateInfoRepository.save(templateInfo);
  }

  async getTemplateInfoOrFail(
    templateInfoID: string,
    options?: FindOneOptions<TemplateInfo>
  ): Promise<ITemplateInfo> {
    const templateInfo = await this.templateInfoRepository.findOne({
      where: { id: templateInfoID },
      ...options,
    });
    if (!templateInfo)
      throw new EntityNotFoundException(
        `TemplateInfo with id(${templateInfoID}) not found!`,
        LogContext.COMMUNITY
      );
    return templateInfo;
  }

  async updateTemplateInfo(
    templateInfo: ITemplateInfo,
    templateInfoData: UpdateTemplateInfoInput
  ): Promise<ITemplateInfo> {
    if (templateInfoData.description) {
      templateInfo.description = templateInfoData.description;
    }
    if (templateInfoData.title) {
      templateInfo.title = templateInfoData.title;
    }
    if (templateInfoData.tags) {
      templateInfo.tagset.tags = templateInfoData.tags;
    }

    return templateInfo;
  }

  async delete(templateInfoID: string): Promise<ITemplateInfo> {
    const templateInfo = await this.getTemplateInfoOrFail(templateInfoID, {
      relations: ['visual'],
    });
    if (templateInfo.visual) {
      await this.visualService.deleteVisual({
        ID: templateInfo.visual.id,
      });
    }

    if (templateInfo.tagset) {
      await this.tagsetService.removeTagset({
        ID: templateInfo.tagset.id,
      });
    }
    const result = await this.templateInfoRepository.remove(
      templateInfo as TemplateInfo
    );
    result.id = templateInfo.id;
    return result;
  }

  async getVisual(templateInfo: ITemplateInfo): Promise<IVisual> {
    const templateInfoPopulated = await this.getTemplateInfoOrFail(
      templateInfo.id,
      {
        relations: ['visual'],
      }
    );
    if (!templateInfoPopulated.visual) {
      throw new EntityNotInitializedException(
        `TemplateInfo not initialized: ${templateInfoPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templateInfoPopulated.visual;
  }
}
