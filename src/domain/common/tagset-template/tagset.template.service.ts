import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.create';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ITagset } from '../tagset/tagset.interface';
import { UpdateTagsetTemplateDefinitionInput } from './dto/tagset.template.dto.update';
import { TagsetTemplate } from './tagset.template.entity';
import { ITagsetTemplate } from './tagset.template.interface';

@Injectable()
export class TagsetTemplateService {
  constructor(
    @InjectRepository(TagsetTemplate)
    private tagsetTemplateRepository: Repository<TagsetTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createTagsetTemplate(
    tagsetTemplateData: CreateTagsetTemplateInput
  ): ITagsetTemplate {
    return new TagsetTemplate(
      tagsetTemplateData.name,
      tagsetTemplateData.type,
      tagsetTemplateData.allowedValues,
      tagsetTemplateData.defaultSelectedValue
    );
  }

  async getTagsetTemplateOrFail(
    tagsetTemplateID: string,
    options?: FindOneOptions<TagsetTemplate>
  ): Promise<ITagsetTemplate | never> {
    const tagsetTemplate = await this.tagsetTemplateRepository.findOne({
      ...options,
      where: { ...options?.where, id: tagsetTemplateID },
    });
    if (!tagsetTemplate)
      throw new EntityNotFoundException(
        `TagsetTemplate with id(${tagsetTemplateID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagsetTemplate;
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

  async updateTagsetTemplateDefinition(
    tagsetTemplate: ITagsetTemplate,
    tagsetTemplateData: UpdateTagsetTemplateDefinitionInput
  ): Promise<ITagsetTemplate> {
    if (tagsetTemplateData.allowedValues) {
      tagsetTemplate.allowedValues = tagsetTemplateData.allowedValues;
    }

    if (tagsetTemplateData.defaultSelectedValue) {
      tagsetTemplate.defaultSelectedValue =
        tagsetTemplateData.defaultSelectedValue;
    }

    return await this.save(tagsetTemplate);
  }

  public async getTagsetsUsingTagsetTemplate(
    tagsetTemplateID: string
  ): Promise<ITagset[]> {
    const tagsetTemplate = await this.getTagsetTemplateOrFail(
      tagsetTemplateID,
      {
        relations: {
          tagsets: true,
        },
      }
    );
    if (!tagsetTemplate.tagsets) {
      throw new EntityNotFoundException(
        `TagsetTemplate with id(${tagsetTemplateID}) has no tagsets!`,
        LogContext.TAGSET
      );
    }
    return tagsetTemplate.tagsets;
  }

  async save(tagsetTemplate: ITagsetTemplate): Promise<ITagsetTemplate> {
    return await this.tagsetTemplateRepository.save(tagsetTemplate);
  }
}
