import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WhiteboardTemplate } from './whiteboard.template.entity';
import { IWhiteboardTemplate } from './whiteboard.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateWhiteboardTemplateInput } from './dto/whiteboard.template.dto.create';
import { UpdateWhiteboardTemplateInput } from './dto/whiteboard.template.dto.update';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@Injectable()
export class WhiteboardTemplateService {
  constructor(
    @InjectRepository(WhiteboardTemplate)
    private whiteboardTemplateRepository: Repository<WhiteboardTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService,
    private whiteboardService: WhiteboardService
  ) {}

  async createWhiteboardTemplate(
    whiteboardTemplateData: CreateWhiteboardTemplateInput,
    parentStorageBucket: IStorageBucket
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate: IWhiteboardTemplate = WhiteboardTemplate.create(
      whiteboardTemplateData
    );
    const result: IWhiteboardTemplate =
      await this.templateBaseService.initialise(
        whiteboardTemplate,
        whiteboardTemplateData,
        parentStorageBucket
      );

    // Allow specifying a Whiteboard to use as a base if no value is set
    if (
      !whiteboardTemplateData.content &&
      whiteboardTemplateData.whiteboardID
    ) {
      const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        whiteboardTemplateData.whiteboardID
      );
      result.content = whiteboard.content;
    }

    return await this.whiteboardTemplateRepository.save(result);
  }

  async getWhiteboardTemplateOrFail(
    whiteboardTemplateID: string,
    options?: FindOneOptions<WhiteboardTemplate>
  ): Promise<IWhiteboardTemplate | never> {
    const whiteboardTemplate = await this.whiteboardTemplateRepository.findOne({
      ...options,
      where: { ...options?.where, id: whiteboardTemplateID },
    });
    if (!whiteboardTemplate)
      throw new EntityNotFoundException(
        `Not able to locate WhiteboardTemplate with the specified ID: ${whiteboardTemplateID}`,
        LogContext.COMMUNICATION
      );
    return whiteboardTemplate;
  }

  async updateWhiteboardTemplate(
    whiteboardTemplateInput: IWhiteboardTemplate,
    whiteboardTemplateData: UpdateWhiteboardTemplateInput
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate = await this.getWhiteboardTemplateOrFail(
      whiteboardTemplateInput.id,
      {
        relations: ['profile'],
      }
    );
    await this.templateBaseService.updateTemplateBase(
      whiteboardTemplate,
      whiteboardTemplateData
    );
    if (whiteboardTemplateData.content) {
      whiteboardTemplate.content = whiteboardTemplateData.content;
    }

    return await this.whiteboardTemplateRepository.save(whiteboardTemplate);
  }

  async deleteWhiteboardTemplate(
    whiteboardTemplateInput: IWhiteboardTemplate
  ): Promise<IWhiteboardTemplate> {
    const whiteboardTemplate = await this.getWhiteboardTemplateOrFail(
      whiteboardTemplateInput.id,
      {
        relations: ['profile'],
      }
    );
    const whiteboardID = whiteboardTemplate.id;
    await this.templateBaseService.deleteEntities(whiteboardTemplate);
    const result = await this.whiteboardTemplateRepository.remove(
      whiteboardTemplate as WhiteboardTemplate
    );
    result.id = whiteboardID;
    return result;
  }

  async save(
    whiteboardTemplate: IWhiteboardTemplate
  ): Promise<IWhiteboardTemplate> {
    return await this.whiteboardTemplateRepository.save(whiteboardTemplate);
  }

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.whiteboardTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }
}
