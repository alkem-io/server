import { LogContext } from '@common/enums';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplateContentSpace } from '../template.content.space.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { TemplateContentSpace } from '../template.content.space.entity';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions } from 'typeorm';

@Injectable()
export class TemplateContentSpaceLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getTemplateContentSpaceOrFail(
    templateContentSpaceID: string,
    options?: FindOneOptions<TemplateContentSpace>
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
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace | null> {
    const space: ITemplateContentSpace | null =
      await this.entityManager.findOne(TemplateContentSpace, {
        ...options,
        where: { ...options?.where, id: spaceID },
      });
    return space;
  }

  public async getTemplateContentSpaceForSpaceAbout(
    spaceAboutID: string,
    options?: FindOneOptions<TemplateContentSpace>
  ): Promise<ITemplateContentSpace | null> {
    const space: ITemplateContentSpace | null =
      await this.entityManager.findOne(TemplateContentSpace, {
        ...options,
        where: {
          ...options?.where,
          about: {
            id: spaceAboutID,
          },
        },
      });
    return space;
  }
}
