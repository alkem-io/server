import { RestrictedTagsetNames } from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { VisualService } from '@domain/common/visual/visual.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CreateTemplateBaseInput } from './dto/template.base.dto.create';
import { UpdateTemplateBaseInput } from './dto/template.base.dto.update';
import { ITemplateBase } from './template.base.interface';

@Injectable()
export class TemplateBaseService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,

    private tagsetService: TagsetService,
    private visualService: VisualService
  ) {}

  async initialise(
    baseTemplate: ITemplateBase,
    baseTemplateData: CreateTemplateBaseInput
  ): Promise<ITemplateBase> {
    baseTemplate.tagset = await this.tagsetService.createTagset({
      name: RestrictedTagsetNames.DEFAULT,
      tags: [],
    });
    if (baseTemplateData.tags) {
      baseTemplate.tagset.tags = baseTemplateData.tags;
    }

    // todo: is this the right dimension?
    baseTemplate.visual = await this.visualService.createVisualBannerNarrow();

    return baseTemplate;
  }

  async updateTemplateBase(
    baseTemplate: ITemplateBase,
    baseTemplateData: UpdateTemplateBaseInput
  ): Promise<ITemplateBase> {
    if (baseTemplateData.description) {
      baseTemplate.description = baseTemplateData.description;
    }
    if (baseTemplateData.title) {
      baseTemplate.title = baseTemplateData.title;
    }
    if (baseTemplateData.tags) {
      baseTemplate.tagset.tags = baseTemplateData.tags;
    }

    return baseTemplate;
  }

  async deleteEntities(baseTemplate: ITemplateBase) {
    if (baseTemplate.visual) {
      await this.visualService.deleteVisual({
        ID: baseTemplate.visual.id,
      });
    }

    if (baseTemplate.tagset) {
      await this.tagsetService.removeTagset({
        ID: baseTemplate.tagset.id,
      });
    }
  }
}
