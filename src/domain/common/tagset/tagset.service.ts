import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { TagsetNotFoundException } from '@common/exceptions/tagset.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CreateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.create';
import { UpdateTagsetInput } from '@domain/common/tagset/dto/tagset.dto.update';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ITagsetTemplate } from '../tagset-template';
import { Tagset } from './tagset.entity';
import { ITagset } from './tagset.interface';
import { tagsets as tagsetsTable } from './tagset.schema';

@Injectable()
export class TagsetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createTagset(tagsetData: CreateTagsetInput): ITagset {
    return Tagset.create({
      ...tagsetData,
      authorization: new AuthorizationPolicy(AuthorizationPolicyType.TAGSET),
      type: tagsetData.type ?? TagsetType.FREEFORM,
      tags: tagsetData?.tags ?? [],
      tagsetTemplate: tagsetData.tagsetTemplate,
    });
  }

  async getTagsetOrFail(
    tagsetID: string,
    options?: { relations?: { tagsetTemplate?: boolean } }
  ): Promise<ITagset> {
    const tagset = await this.db.query.tagsets.findFirst({
      where: eq(tagsetsTable.id, tagsetID),
      with: options?.relations?.tagsetTemplate
        ? { tagsetTemplate: true }
        : undefined,
    });
    if (!tagset)
      throw new EntityNotFoundException(
        `Tagset with id(${tagsetID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagset as unknown as ITagset;
  }

  async removeTagset(tagsetID: string): Promise<ITagset> {
    const tagset = await this.getTagsetOrFail(tagsetID);
    if (tagset.authorization)
      await this.authorizationPolicyService.delete(tagset.authorization);

    await this.db.delete(tagsetsTable).where(eq(tagsetsTable.id, tagsetID));
    return tagset;
  }

  async updateTagset(tagsetData: UpdateTagsetInput): Promise<ITagset> {
    const tagset = await this.getTagsetOrFail(tagsetData.ID, {
      relations: { tagsetTemplate: true },
    });

    switch (tagset.type) {
      case TagsetType.FREEFORM:
        break;
      case TagsetType.SELECT_ONE:
      case TagsetType.SELECT_MANY: {
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
    }

    this.updateTagsetValues(tagset, tagsetData);
    const [updated] = await this.db
      .update(tagsetsTable)
      .set({
        name: tagset.name,
        tags: tagset.tags,
      })
      .where(eq(tagsetsTable.id, tagset.id))
      .returning();
    return updated as unknown as ITagset;
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

  async getAllowedValuesOrFail(tagset: ITagset): Promise<string[]> {
    if (tagset.type === TagsetType.FREEFORM) return [];

    const tagsetTemplate = await this.getTagsetTemplateOrFail(tagset.id);
    return tagsetTemplate.allowedValues;
  }

  async getTagsetTemplateOrFail(tagsetID: string): Promise<ITagsetTemplate> {
    const tagset = await this.getTagsetOrFail(tagsetID, {
      relations: {
        tagsetTemplate: true,
      },
    });

    const tagsetTemplate = tagset.tagsetTemplate;
    if (!tagsetTemplate)
      throw new RelationshipNotFoundException(
        `Unable to load tagsetTemplate for Tagset: ${tagsetID}`,
        LogContext.PROFILE
      );

    return tagsetTemplate;
  }

  // Get the default tagset
  defaultTagset(tagsets: ITagset[]): ITagset | undefined {
    const defaultTagset = tagsets.find(
      t => t.tagsetTemplate?.name === TagsetReservedName.DEFAULT
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

  public async updateTagsetsSelectedValue(
    tagsets: ITagset[],
    allowedValues: string[],
    newDefaultValue: string,
    valueRenamed?: { old: string; new: string }
  ): Promise<void> {
    // Finally update
    const isDefaultValueAllowed = allowedValues.some(
      allowedValue => newDefaultValue === allowedValue
    );
    if (!isDefaultValueAllowed) {
      throw new ValidationException(
        `TagsetTemplate newDefaultValue(${newDefaultValue}) is not in allowedValues!`,
        LogContext.TAGSET
      );
    }
    for (const tagset of tagsets) {
      const tagsetSelectedValue = tagset.tags[0];
      const isNameAllowed = allowedValues.some(
        allowedValue => tagsetSelectedValue === allowedValue
      );
      if (isNameAllowed) {
        continue;
      }
      if (valueRenamed && tagsetSelectedValue === valueRenamed.old) {
        tagset.tags = [valueRenamed.new];
        continue;
      }
      tagset.tags = [newDefaultValue];
      await this.db
        .update(tagsetsTable)
        .set({ tags: tagset.tags })
        .where(eq(tagsetsTable.id, tagset.id));
    }
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
        `Unable to find tagset with the name: '${name}' in provided tagsets: ${JSON.stringify(
          tagsets
        )}`,
        LogContext.PROFILE
      );
    }
    return tagset;
  }

  public createTagsetWithName(
    existingTagsets: ITagset[],
    tagsetData: CreateTagsetInput
  ): ITagset {
    // Check if the group already exists, if so log a warning
    if (this.hasTagsetWithName(existingTagsets, tagsetData.name)) {
      throw new ValidationException(
        `Already exists a Tagset with the given name: ${tagsetData.name}`,
        LogContext.COMMUNITY
      );
    }

    return this.createTagset(tagsetData);
  }

  async save(tagset: ITagset): Promise<ITagset> {
    if (tagset.id) {
      const [updated] = await this.db
        .update(tagsetsTable)
        .set({
          name: tagset.name,
          tags: tagset.tags,
          type: tagset.type,
        })
        .where(eq(tagsetsTable.id, tagset.id))
        .returning();
      return updated as unknown as ITagset;
    } else {
      const [inserted] = await this.db
        .insert(tagsetsTable)
        .values({
          name: tagset.name,
          tags: tagset.tags,
          type: tagset.type,
          authorizationId: tagset.authorization?.id,
          tagsetTemplateId: tagset.tagsetTemplate?.id,
        })
        .returning();
      return inserted as unknown as ITagset;
    }
  }

  // Note: provided data has priority when it comes to tags
  public updateTagsetInputs(
    tagsetInputData: CreateTagsetInput[] | undefined,
    additionalTagsetInputs: CreateTagsetInput[]
  ): CreateTagsetInput[] {
    const result: CreateTagsetInput[] = [...additionalTagsetInputs];

    if (!tagsetInputData) return result;

    for (const tagsetInput of tagsetInputData) {
      const existingInput = result.find(t => t.name === tagsetInput.name);
      if (existingInput) {
        // Do not change type, name etc - only tags
        if (tagsetInput.tags) {
          existingInput.tags = tagsetInput.tags;
        }
      } else {
        result.push(tagsetInput);
      }
    }
    return result;
  }

  // Note: provided data has priority when it comes to tags
  public updatedTagsetInputUsingProvidedData(
    baseTagsetInputData: CreateTagsetInput[],
    additionalTagsetInputs?: CreateTagsetInput[]
  ): CreateTagsetInput[] {
    if (!additionalTagsetInputs) return baseTagsetInputData;
    const result: CreateTagsetInput[] = [...baseTagsetInputData];

    for (const additionalTagSetInput of additionalTagsetInputs) {
      const existingInput = result.find(
        t => t.name === additionalTagSetInput.name
      );
      if (existingInput) {
        // Do not change type, name etc - only tags
        if (additionalTagSetInput.tags) {
          existingInput.tags = additionalTagSetInput.tags;
        }
      } else {
        this.logger.warn(
          `Unable to find tagset with the name: ${additionalTagSetInput.name} in provided tagsets: ${JSON.stringify(
            result
          )}`,
          LogContext.TAGSET
        );
      }
    }
    return result;
  }

  public convertTagsetTemplatesToCreateTagsetInput(
    tagsetTemplates: ITagsetTemplate[]
  ): CreateTagsetInput[] {
    const result: CreateTagsetInput[] = [];
    for (const tagsetTemplate of tagsetTemplates) {
      const input: CreateTagsetInput = {
        name: tagsetTemplate.name,
        type: tagsetTemplate.type,
        tagsetTemplate: tagsetTemplate,
        tags: tagsetTemplate.defaultSelectedValue
          ? [tagsetTemplate.defaultSelectedValue]
          : undefined,
      };
      result.push(input);
    }
    return result;
  }
}
