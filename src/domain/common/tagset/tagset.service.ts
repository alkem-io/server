import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FindOneOptions, Repository } from 'typeorm';
import { Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { UpdateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.update';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { TagsetType } from '@common/enums/tagset.type';
import { ITagsetTemplate } from '../tagset-template';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetNotFoundException } from '@common/exceptions/tagset.not.found.exception';

@Injectable()
export class TagsetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Tagset)
    private tagsetRepository: Repository<Tagset>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTagset(tagsetData: CreateTagsetInput): Promise<ITagset> {
    if (!tagsetData.type) tagsetData.type = TagsetType.FREEFORM;
    const tagset: ITagset = Tagset.create({ ...tagsetData });
    tagset.authorization = new AuthorizationPolicy();
    if (!tagset.tags) tagset.tags = [];
    tagset.tagsetTemplate = tagsetData.tagsetTemplate;
    return await this.tagsetRepository.save(tagset);
  }

  async getTagsetOrFail(
    tagsetID: string,
    options?: FindOneOptions<Tagset>
  ): Promise<ITagset> {
    const tagset = await this.tagsetRepository.findOne({
      where: { id: tagsetID },
      ...options,
    });
    if (!tagset)
      throw new EntityNotFoundException(
        `Tagset with id(${tagsetID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagset as ITagset;
  }

  async removeTagset(tagsetID: string): Promise<ITagset> {
    const tagset = await this.getTagsetOrFail(tagsetID);
    if (tagset.authorization)
      await this.authorizationPolicyService.delete(tagset.authorization);

    const result = await this.tagsetRepository.remove(tagset as Tagset);
    result.id = tagsetID;
    return result;
  }

  async updateTagset(tagsetData: UpdateTagsetInput): Promise<ITagset> {
    const tagset = await this.getTagsetOrFail(tagsetData.ID, {
      relations: ['tagsetTemplate'],
    });

    switch (tagset.type) {
      case TagsetType.FREEFORM:
        break;
      case TagsetType.SELECT_ONE:
      case TagsetType.SELECT_MANY:
        const tagsetTemplate = tagset.tagsetTemplate;
        if (!tagsetTemplate) {
          throw new EntityNotFoundException(
            'Unable to load tagset template for tagset with allowedValues',
            LogContext.TAGSET
          );
        }
        const tags = tagsetData.tags;
        if (tagset.type === TagsetType.SELECT_ONE) {
          if (tags.length !== 1) {
            throw new ValidationException(
              'Tags array length should be exactly one',
              LogContext.TAGSET
            );
          }
        }
        this.validateForAllowedValues(tags, tagsetTemplate.allowedValues);
    }

    this.updateTagsetValues(tagset, tagsetData);
    return await this.tagsetRepository.save(tagset);
  }

  validateForAllowedValues(tags: string[], allowedValues: string[]) {
    const result = tags.every(tag => allowedValues.includes(tag));
    if (!result) {
      throw new ValidationException(
        `Provided tags (${tags}) has values that are not in allowedValues: ${allowedValues}`,
        LogContext.TAGSET
      );
    }
  }

  updateTagsetValues(tagset: ITagset, tagsetData: UpdateTagsetInput): ITagset {
    if (tagsetData.name) {
      tagset.name = tagsetData.name;
    }

    if (tagsetData.tags) {
      tagset.tags = tagsetData.tags;
    }

    return tagset;
  }

  updateTagsOnTagsetByName(
    tagsets: ITagset[],
    tagsetName: string,
    tags: string[]
  ): ITagset {
    const tagset = this.getTagsetByNameOrFail(tagsets, tagsetName);
    tagset.tags = tags;
    return tagset;
  }

  updateTagsets(
    tagsets: ITagset[] | undefined,
    tagsetsData: UpdateTagsetInput[]
  ): ITagset[] {
    if (!tagsets)
      throw new EntityNotFoundException(
        'Not able to locate Tagsets',
        LogContext.TAGSET
      );
    if (tagsetsData) {
      for (const tagsetData of tagsetsData) {
        // check the Tagset being update is part of the current entity
        const tagset = tagsets.find(tagset => tagset.id === tagsetData.ID);
        if (!tagset)
          throw new EntityNotFoundException(
            `Unable to update Tagset with supplied ID: ${tagsetData.ID} - no such Tagset in parent entity.`,
            LogContext.TAGSET
          );
        this.updateTagsetValues(tagset, tagsetData);
      }
    }
    return tagsets;
  }

  async getAllowedValues(tagset: ITagset): Promise<string[]> {
    if (tagset.type === TagsetType.FREEFORM) return [];

    const tagsetTemplate = await this.getTagsetTemplateOrFail(tagset.id);
    return tagsetTemplate.allowedValues;
  }

  async getTagsetTemplateOrFail(tagsetID: string): Promise<ITagsetTemplate> {
    const tagset = await this.getTagsetOrFail(tagsetID, {
      relations: ['tagsetTemplate'],
    });

    const tagsetTemplate = tagset.tagsetTemplate;
    if (!tagsetTemplate)
      throw new RelationshipNotFoundException(
        `Unable to load tagsetTemplate for Tagset: ${tagsetID} `,
        LogContext.PROFILE
      );

    return tagsetTemplate;
  }

  // Get the default tagset
  defaultTagset(tagsets: ITagset[]): ITagset | undefined {
    const defaultTagset = tagsets.find(
      t => t.name === TagsetReservedName.DEFAULT
    );
    return defaultTagset;
  }

  hasTagsetWithName(tagsets: ITagset[], name: string): boolean {
    // Find the right group
    for (const tagset of tagsets) {
      if (tagset.name === name) {
        return true;
      }
    }

    // If get here then no match group was found
    return false;
  }

  getTagsetByName(tagsets: ITagset[], name: string): ITagset | undefined {
    //
    if (name === '') {
      throw new TagsetNotFoundException(
        `Name not specified when looking up in provided tagsets: ${JSON.stringify(
          tagsets
        )}`,
        LogContext.PROFILE
      );
    }

    for (const tagset of tagsets) {
      if (tagset.name === name) {
        return tagset;
      }
    }

    return undefined;
  }

  getTagsetByNameOrFail(tagsets: ITagset[], name: string): ITagset {
    const tagset = this.getTagsetByName(tagsets, name);
    if (!tagset) {
      throw new TagsetNotFoundException(
        `Unable to find tagset with the name: + ${name} in provided tagsets: ${JSON.stringify(
          tagsets
        )}`,
        LogContext.PROFILE
      );
    }
    return tagset;
  }

  async createTagsetWithName(
    existingTagsets: ITagset[],
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    // Check if the group already exists, if so log a warning
    if (this.hasTagsetWithName(existingTagsets, tagsetData.name)) {
      throw new ValidationException(
        `Already exists a Tagset with the given name: ${tagsetData.name}`,
        LogContext.COMMUNITY
      );
    }

    return await this.createTagset(tagsetData);
  }

  async save(tagset: ITagset): Promise<ITagset> {
    return await this.tagsetRepository.save(tagset);
  }
}
