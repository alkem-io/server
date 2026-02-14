import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template/dto/tagset.template.dto.create';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { ITagset } from '../tagset/tagset.interface';
import { UpdateTagsetTemplateDefinitionInput } from './dto/tagset.template.dto.update';
import { TagsetTemplate } from './tagset.template.entity';
import { ITagsetTemplate } from './tagset.template.interface';
import { tagsetTemplates } from './tagset.template.schema';

@Injectable()
export class TagsetTemplateService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
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
    options?: { relations?: { tagsets?: boolean } }
  ): Promise<ITagsetTemplate | never> {
    const tagsetTemplate = await this.db.query.tagsetTemplates.findFirst({
      where: eq(tagsetTemplates.id, tagsetTemplateID),
      with: options?.relations?.tagsets
        ? { tagsets: true }
        : undefined,
    });
    if (!tagsetTemplate)
      throw new EntityNotFoundException(
        `TagsetTemplate with id(${tagsetTemplateID}) not found!`,
        LogContext.COMMUNITY
      );
    return tagsetTemplate as unknown as ITagsetTemplate;
  }

  async removeTagsetTemplate(
    tagsetTemplate: ITagsetTemplate
  ): Promise<ITagsetTemplate> {
    await this.db.delete(tagsetTemplates).where(eq(tagsetTemplates.id, tagsetTemplate.id));
    return tagsetTemplate;
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
    if (tagsetTemplate.id) {
      const [updated] = await this.db
        .update(tagsetTemplates)
        .set({
          allowedValues: tagsetTemplate.allowedValues,
          defaultSelectedValue: tagsetTemplate.defaultSelectedValue,
        })
        .where(eq(tagsetTemplates.id, tagsetTemplate.id))
        .returning();
      return updated as unknown as ITagsetTemplate;
    } else {
      const [inserted] = await this.db
        .insert(tagsetTemplates)
        .values({
          name: tagsetTemplate.name,
          type: tagsetTemplate.type,
          allowedValues: tagsetTemplate.allowedValues,
          defaultSelectedValue: tagsetTemplate.defaultSelectedValue,
          tagsetTemplateSetId: (tagsetTemplate as any).tagsetTemplateSetId ?? (tagsetTemplate as any).tagsetTemplateSet?.id,
        })
        .returning();
      return inserted as unknown as ITagsetTemplate;
    }
  }
}
