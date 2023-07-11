import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagsetTemplate } from './tagset.template.entity';
import { ITagsetTemplate } from './tagset.template.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.create';
import { UpdateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.update';

@Injectable()
export class TagsetTemplateService {
  constructor(
    @InjectRepository(TagsetTemplate)
    private tagsetTemplateRepository: Repository<TagsetTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTagsetTemplate(
    tagsetTemplateData: CreateTagsetTemplateInput
  ): Promise<ITagsetTemplate> {
    const tagsetTemplate = new TagsetTemplate(
      tagsetTemplateData.name,
      tagsetTemplateData.type,
      tagsetTemplateData.allowedValues,
      tagsetTemplateData.defaultSelectedValue
    );

    return await this.tagsetTemplateRepository.save(tagsetTemplate);
  }

  async getTagsetTemplateOrFail(
    tagsetTemplateID: string
  ): Promise<ITagsetTemplate> {
    const tagsetTemplate = await this.tagsetTemplateRepository.findOneBy({
      id: tagsetTemplateID,
    });
    if (!tagsetTemplate)
      throw new EntityNotFoundException(
        `TagsetTemplate with id(${tagsetTemplateID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagsetTemplate as ITagsetTemplate;
  }

  async removeTagsetTemplate(
    tagsetTemplate: ITagsetTemplate
  ): Promise<ITagsetTemplate> {
    const tagsetTemplateID = tagsetTemplate.id;

    const result = await this.tagsetTemplateRepository.remove(
      tagsetTemplate as TagsetTemplate
    );
    result.id = tagsetTemplateID;
    return result;
  }

  async updateTagsetTemplate(
    tagsetTemplate: ITagsetTemplate,
    tagsetTemplateData: UpdateTagsetTemplateInput
  ): Promise<ITagsetTemplate> {
    if (tagsetTemplateData.name) {
      tagsetTemplate.name = tagsetTemplateData.name;
    }

    if (tagsetTemplateData.allowedValues) {
      tagsetTemplate.allowedValues = tagsetTemplateData.allowedValues;
    }

    if (tagsetTemplateData.defaultSelectedValue) {
      tagsetTemplate.defaultSelectedValue =
        tagsetTemplateData.defaultSelectedValue;
    }

    return await this.save(tagsetTemplate);
  }

  async save(tagsetTemplate: ITagsetTemplate): Promise<ITagsetTemplate> {
    return await this.tagsetTemplateRepository.save(tagsetTemplate);
  }
}
