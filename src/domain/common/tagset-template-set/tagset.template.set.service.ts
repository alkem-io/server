import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { CreateTagsetTemplateInput } from '../tagset-template/dto/tagset.template.dto.create';
import { ITagsetTemplate } from '../tagset-template/tagset.template.interface';
import { TagsetTemplateService } from '../tagset-template/tagset.template.service';
import { ITagsetTemplateSet } from '.';
import { TagsetTemplateSet } from './tagset.template.set.entity';
import { tagsetTemplateSets } from './tagset.template.set.schema';

@Injectable()
export class TagsetTemplateSetService {
  constructor(
    private tagsetTemplateService: TagsetTemplateService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createTagsetTemplateSet(): ITagsetTemplateSet {
    return TagsetTemplateSet.create({
      tagsetTemplates: [],
    });
  }

  async deleteTagsetTemplateSet(
    tagsetTemplateSetID: string
  ): Promise<ITagsetTemplateSet> {
    const tagsetTemplateSet = await this.getTagsetTemplateSetOrFail(
      tagsetTemplateSetID,
      {
        relations: { tagsetTemplates: true },
      }
    );

    if (tagsetTemplateSet.tagsetTemplates) {
      for (const tagsetTemplate of tagsetTemplateSet.tagsetTemplates) {
        await this.tagsetTemplateService.removeTagsetTemplate(tagsetTemplate);
      }
    }

    await this.db.delete(tagsetTemplateSets).where(eq(tagsetTemplateSets.id, tagsetTemplateSetID));
    return tagsetTemplateSet;
  }

  private async getTagsetTemplateSetOrFail(
    tagsetTemplateSetID: string,
    options?: { relations?: { tagsetTemplates?: boolean } }
  ): Promise<ITagsetTemplateSet | never> {
    const tagsetTemplateSet = await this.db.query.tagsetTemplateSets.findFirst({
      where: eq(tagsetTemplateSets.id, tagsetTemplateSetID),
      with: options?.relations?.tagsetTemplates
        ? { tagsetTemplates: true }
        : undefined,
    });
    if (!tagsetTemplateSet)
      throw new EntityNotFoundException(
        `TagsetTemplateSet with id(${tagsetTemplateSetID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagsetTemplateSet as unknown as ITagsetTemplateSet;
  }

  public async save(
    tagsetTemplateSet: ITagsetTemplateSet
  ): Promise<ITagsetTemplateSet> {
    if (tagsetTemplateSet.id) {
      const [updated] = await this.db
        .update(tagsetTemplateSets)
        .set({})
        .where(eq(tagsetTemplateSets.id, tagsetTemplateSet.id))
        .returning();
      return updated as unknown as ITagsetTemplateSet;
    } else {
      const [inserted] = await this.db
        .insert(tagsetTemplateSets)
        .values({})
        .returning();
      return inserted as unknown as ITagsetTemplateSet;
    }
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

  private hasTagsetTemplateWithName(
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

  public addTagsetTemplate(
    tagsetTemplateSet: ITagsetTemplateSet,
    tagsetTemplateData: CreateTagsetTemplateInput
  ): ITagsetTemplateSet {
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
      this.tagsetTemplateService.createTagsetTemplate(tagsetTemplateData);
    tagsetTemplateSet.tagsetTemplates.push(tagsetTemplate);

    return tagsetTemplateSet;
  }
}
