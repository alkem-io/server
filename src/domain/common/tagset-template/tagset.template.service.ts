import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagsetTemplate } from './tagset.template.entity';
import { ITagsetTemplate } from './tagset.template.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import { EntityNotFoundException, ValidationException } from '@common/exceptions';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.create';
import { UpdateTagsetTemplateDefinitionInput } from './dto/tagset.template.dto.update';

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

    if (tagsetTemplateData.newSelectedValue) {
      // verify in new allowed values
      const isNameAllowed = tagsetTemplate.allowedValues.some(
        allowedValue => tagsetTemplateData.newSelectedValue === allowedValue
      );
      if (!isNameAllowed) {
        throw new ValidationException(
          `TagsetTemplate newSelectedValue(${tagsetTemplateData.newSelectedValue}) is not in allowedValues!`,
          LogContext.TAGSET
        );
      }
    }
    // Finally update
    if (tagsetTemplate.tagsets)
      for (const tagset of tagsetTemplate.tagsets) {
        const tagsetSelectedValue = tagset.tags[0];
        const isNameAllowed = tagsetTemplate.allowedValues.some(
          allowedValue => tagsetSelectedValue === allowedValue
        );
        if (!isNameAllowed) {
          if (
            tagsetSelectedValue === tagsetTemplateData.oldSelectedValue &&
            tagsetTemplateData.newSelectedValue
          ) {
            tagset.tags = [tagsetTemplateData.newSelectedValue];
          } else {
            if (!tagsetTemplate.defaultSelectedValue) {
              throw new ValidationException(
                `TagsetTemplate defaultSelectedValue must be set (${tagsetTemplate.id})`,
                LogContext.TAGSET
              );
            }
            tagset.tags = [tagsetTemplate.defaultSelectedValue];
          }
        }
      }

    return await this.save(tagsetTemplate);
  }

  async save(tagsetTemplate: ITagsetTemplate): Promise<ITagsetTemplate> {
    return await this.tagsetTemplateRepository.save(tagsetTemplate);
  }
}
