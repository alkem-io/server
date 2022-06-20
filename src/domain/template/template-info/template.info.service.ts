import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { VisualService } from '@domain/common/visual/visual.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TemplateInfo } from './template.info.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateTemplateInfoInput } from './dto/template.info.dto.create';
import { ITemplateInfo } from './template.info.interface';
import { UpdateTemplateInfoInput } from './dto/template.base.dto.update';

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
      tags: [],
    });
    if (templateInfoData.tags) {
      templateInfo.tagset.tags = templateInfoData.tags;
    }

    templateInfo.visual = await this.visualService.createVisualBannerNarrow();

    return await this.templateInfoRepository.save(templateInfo);
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

  async delete(templateInfo: ITemplateInfo): Promise<ITemplateInfo> {
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
}
