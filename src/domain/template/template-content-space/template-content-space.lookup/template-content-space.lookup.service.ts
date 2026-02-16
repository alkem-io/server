import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { templateContentSpaces } from '../template.content.space.schema';
import { ITemplateContentSpace } from '../template.content.space.interface';

@Injectable()
export class TemplateContentSpaceLookupService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getTemplateContentSpaceOrFail(
    templateContentSpaceID: string,
    options?: { relations?: Record<string, any> }
  ): Promise<ITemplateContentSpace | never> {
    const space = await this.getTemplateContentSpace(
      templateContentSpaceID,
      options
    );
    if (!space)
      throw new EntityNotFoundException(
        'Unable to find TemplateContentSpace',
        LogContext.TEMPLATES,
        { templateContentSpaceID }
      );
    return space;
  }

  private async getTemplateContentSpace(
    spaceID: string,
    options?: { relations?: Record<string, any> }
  ): Promise<ITemplateContentSpace | null> {
    const space = await this.db.query.templateContentSpaces.findFirst({
      where: eq(templateContentSpaces.id, spaceID),
      with: options?.relations,
    });
    return (space as unknown as ITemplateContentSpace) ?? null;
  }

  public async getTemplateContentSpaceForSpaceAbout(
    spaceAboutID: string,
    options?: { relations?: Record<string, any> }
  ): Promise<ITemplateContentSpace | null> {
    const space = await this.db.query.templateContentSpaces.findFirst({
      where: eq(templateContentSpaces.aboutId, spaceAboutID),
      with: options?.relations,
    });
    return (space as unknown as ITemplateContentSpace) ?? null;
  }
}
