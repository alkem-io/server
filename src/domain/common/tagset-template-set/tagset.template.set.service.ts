import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { TagsetTemplateSet } from './tagset.template.set.entity';
import { TagsetTemplateService } from '../tagset-template/tagset.template.service';
import { ITagsetTemplateSet } from '.';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { CreateTagsetTemplateInput } from '../tagset-template/dto/tagset.template.dto.create';

@Injectable()
export class TagsetTemplateSetService {
  constructor(
    private tagsetTemplateService: TagsetTemplateService,
    @InjectRepository(TagsetTemplateSet)
    private tagsetTemplateSetRepository: Repository<TagsetTemplateSet>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTagsetTemplateSet(): Promise<ITagsetTemplateSet> {
    const tagsetTemplateSet: ITagsetTemplateSet = TagsetTemplateSet.create();
    tagsetTemplateSet.tagsetTemplates = [];

    return await this.save(tagsetTemplateSet);
  }

  async deleteTagsetTemplateSet(
    tagsetTemplateSetID: string
  ): Promise<ITagsetTemplateSet> {
    const tagsetTemplateSet = await this.getTagsetTemplateSetOrFail(
      tagsetTemplateSetID,
      {
        relations: [],
      }
    );

    if (tagsetTemplateSet.tagsetTemplates) {
      for (const tagsetTemplate of tagsetTemplateSet.tagsetTemplates) {
        await this.tagsetTemplateService.removeTagsetTemplate(tagsetTemplate);
      }
    }

    return await this.tagsetTemplateSetRepository.remove(
      tagsetTemplateSet as TagsetTemplateSet
    );
  }

  async getTagsetTemplateSetOrFail(
    tagsetTemplateSetID: string,
    options?: FindOneOptions<TagsetTemplateSet>
  ): Promise<ITagsetTemplateSet | never> {
    const tagsetTemplateSet = await TagsetTemplateSet.findOne({
      where: { id: tagsetTemplateSetID },
      ...options,
    });
    if (!tagsetTemplateSet)
      throw new EntityNotFoundException(
        `TagsetTemplateSet with id(${tagsetTemplateSetID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagsetTemplateSet;
  }

  async save(
    tagsetTemplateSet: ITagsetTemplateSet
  ): Promise<ITagsetTemplateSet> {
    return await this.tagsetTemplateSetRepository.save(tagsetTemplateSet);
  }

  getTagsetTemplatesOrFail(
    tagsetTemplateSet: ITagsetTemplateSet
  ): ITagsetTemplate[] {
    const tagsetTemplates = tagsetTemplateSet.tagsetTemplates;
    if (!tagsetTemplates) {
      throw new EntityNotFoundException(
        `Unable to obtain tagsetTemplates on TagsetTemplateSet: ${tagsetTemplateSet.id}`,
        LogContext.COMMUNITY
      );
    }
    return tagsetTemplates;
  }

  hasTagsetTemplateWithName(
    tagsetTemplateSet: ITagsetTemplateSet,
    name: string
  ): boolean {
    for (const tagsetTemplate of tagsetTemplateSet.tagsetTemplates) {
      if (tagsetTemplate.name === name) {
        return true;
      }
    }

    return false;
  }

  async addTagsetTemplate(
    tagsetTemplateSet: ITagsetTemplateSet,
    tagsetTemplateData: CreateTagsetTemplateInput
  ): Promise<ITagsetTemplateSet> {
    // Check if the group already exists, if so log a warning
    if (
      this.hasTagsetTemplateWithName(tagsetTemplateSet, tagsetTemplateData.name)
    ) {
      throw new ValidationException(
        `Already exists a TagsetTemplate with the given name: ${tagsetTemplateData.name}`,
        LogContext.COMMUNITY
      );
    }

    const tagsetTemplate =
      await this.tagsetTemplateService.createTagsetTemplate(tagsetTemplateData);
    tagsetTemplateSet.tagsetTemplates.push(tagsetTemplate);

    return await this.save(tagsetTemplateSet);
  }
}
