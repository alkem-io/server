import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Project } from '@domain/collaboration/project/project.entity';
import { RestrictedTagsetNames, Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { ITagsetable } from '@src/common/interfaces';
import {
  CreateTagsetInput,
  UpdateTagsetInput,
  DeleteTagsetInput,
} from '@domain/common/tagset';
import validator from 'validator';
import {} from './tagset.dto.delete';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

@Injectable()
export class TagsetService {
  constructor(
    @InjectRepository(Tagset)
    private tagsetRepository: Repository<Tagset>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTagset(tagsetData: CreateTagsetInput): Promise<ITagset> {
    const tagset = Tagset.create(tagsetData);
    if (!tagset.tags) tagset.tags = [];
    return await this.tagsetRepository.save(tagset);
  }

  createDefaultTagset() {
    const tagset = Tagset.create();
    tagset.name = RestrictedTagsetNames.Default;
    tagset.tags = [];
    return tagset;
  }

  async getTagsetOrFail(tagsetID: string): Promise<ITagset> {
    if (validator.isNumeric(tagsetID)) {
      const idInt: number = parseInt(tagsetID);
      return await this.getTagsetByIdOrFail(idInt);
    }
    throw new EntityNotFoundException(
      `Tagset with id(${tagsetID}) not found!`,
      LogContext.COMMUNITY
    );
  }

  async getTagsetByIdOrFail(tagsetID: number): Promise<ITagset> {
    const tagset = await this.tagsetRepository.findOne({ id: tagsetID });
    if (!tagset)
      throw new EntityNotFoundException(
        `Tagset with id(${tagsetID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagset as ITagset;
  }

  async removeTagset(deleteData: DeleteTagsetInput): Promise<ITagset> {
    const tagsetID = parseInt(deleteData.ID);
    const tagset = await this.getTagsetByIdOrFail(tagsetID);
    const result = await this.tagsetRepository.remove(tagset as Tagset);
    result.id = tagsetID;
    return result;
  }

  async updateTagset(tagsetData: UpdateTagsetInput): Promise<ITagset> {
    const tagset = await this.getTagsetByIdOrFail(parseInt(tagsetData.ID));
    this.updateTagsetValues(tagset, tagsetData);
    return await this.tagsetRepository.save(tagset);
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

  updateTagsets(
    tagsets: ITagset[] | undefined,
    tagsetsData: UpdateTagsetInput[]
  ): ITagset[] {
    if (!tagsets)
      throw new EntityNotFoundException(
        'Not able to locate Tagsets',
        LogContext.CHALLENGES
      );
    if (tagsetsData) {
      for (const tagsetData of tagsetsData) {
        // check the Tagset being update is part of the current entity
        const tagset = tagsets.find(
          tagset => tagset.id == parseInt(tagsetData.ID)
        );
        if (!tagset)
          throw new EntityNotFoundException(
            `Unable to update Tagset with supplied ID: ${tagsetData.ID} - no such Tagset in parent entity.`,
            LogContext.CHALLENGES
          );
        this.updateTagsetValues(tagset, tagsetData);
      }
    }
    return tagsets;
  }

  replaceTagsOnEntity(entity: BaseChallenge | Project, tags: string[]) {
    if (!entity.tagset)
      throw new EntityNotInitializedException(
        `Entity with id(${entity.id}) not initialised with a tagset!`,
        LogContext.COMMUNITY
      );
    entity.tagset.tags = [...tags];
    return entity;
  }

  async createRestrictedTagsets(
    tagsetable: ITagsetable,
    names: string[]
  ): Promise<boolean> {
    if (!tagsetable.restrictedTagsetNames) {
      throw new EntityNotInitializedException(
        'Non-initialised tagsetable submitted',
        LogContext.COMMUNITY
      );
    }
    for (const name of names) {
      const tagset = await this.createTagset({
        name: name,
      });
      tagsetable.tagsets?.push(tagset);
    }
    return true;
  }

  // Get the default tagset
  defaultTagset(tagsetable: ITagsetable): ITagset | undefined {
    if (!tagsetable.tagsets)
      throw new EntityNotInitializedException(
        'Tagsets not initialised',
        LogContext.COMMUNITY
      );
    const defaultTagset = tagsetable.tagsets.find(
      t => t.name === RestrictedTagsetNames.Default
    );
    return defaultTagset;
  }

  hasTagsetWithName(tagsetable: ITagsetable, name: string): boolean {
    // Double check groups array is initialised
    if (!tagsetable.tagsets) {
      throw new Error('Non-initialised Tagsets submitted');
    }

    // Find the right group
    for (const tagset of tagsetable.tagsets) {
      if (tagset.name === name) {
        return true;
      }
    }

    // If get here then no match group was found
    return false;
  }

  getTagsetByName(tagsetable: ITagsetable, name: string): ITagset {
    // Double check groups array is initialised
    if (!tagsetable.tagsets) {
      throw new Error('Non-initialised tagsetable submitted');
    }

    for (const tagset of tagsetable.tagsets) {
      if (tagset.name === name) {
        return tagset;
      }
    }

    // If get here then no match group was found
    throw new Error('Unable to find tagset with the name:' + { name });
  }

  async addTagsetWithName(
    tagsetable: ITagsetable,
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    // Check if the group already exists, if so log a warning
    if (this.hasTagsetWithName(tagsetable, tagsetData.name)) {
      throw new ValidationException(
        `Already exists a Tagset with the given name: ${tagsetData.name}`,
        LogContext.COMMUNITY
      );
    }

    if (tagsetable.restrictedTagsetNames?.includes(tagsetData.name)) {
      throw new ValidationException(
        `Restricted Tagset name: ${tagsetData.name}`,
        LogContext.COMMUNITY
      );
    }

    const newTagset = await this.createTagset(tagsetData);
    tagsetable.tagsets?.push(newTagset);
    return newTagset;
  }

  hasTag(tagset: ITagset, tagToCheck: string): boolean {
    for (const tag of tagset.tags) {
      if (tag === tagToCheck) return true;
    }
    return false;
  }
}
