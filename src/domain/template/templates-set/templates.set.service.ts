import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from './templates.set.interface';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { AspectTemplateService } from '../aspect-template/aspect.template.service';
import { DeleteAspectTemplateOnTemplateSetInput } from './dto/aspect.template.dto.delete.on.template.set';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { templatesSetDefaults } from './templates.set.defaults';
import { CreateAspectTemplateInput } from '../aspect-template/dto/aspect.template.dto.create';
import { UpdateAspectTemplateInput } from '../aspect-template/dto/aspect.template.dto.update';
import { CanvasTemplateService } from '../canvas-template/canvas.template.service';
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';
import { CreateCanvasTemplateInput } from '../canvas-template/dto/canvas.template.dto.create';
import { UpdateCanvasTemplateInput } from '../canvas-template/dto/canvas.template.dto.update';
import { DeleteCanvasTemplateOnTemplateSetInput } from './dto/canvas.template.dto.delete.on.template.set';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private aspectTemplateService: AspectTemplateService,
    private canvasTemplateService: CanvasTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy();
    templatesSet.aspectTemplates = [];
    for (const aspectTemplateDefault of templatesSetDefaults.aspects) {
      const aspectTemplate =
        await this.aspectTemplateService.createAspectTemplate(
          aspectTemplateDefault
        );
      templatesSet.aspectTemplates.push(aspectTemplate);
    }

    templatesSet.canvasTemplates = [];

    return await this.templatesSetRepository.save(templatesSet);
  }

  async getTemplatesSetOrFail(
    templatesSetID: string,
    options?: FindOneOptions<TemplatesSet>
  ): Promise<ITemplatesSet> {
    const templatesSet = await TemplatesSet.findOne(
      { id: templatesSetID },
      options
    );
    if (!templatesSet)
      throw new EntityNotFoundException(
        `TemplatesSet with id(${templatesSetID}) not found!`,
        LogContext.COMMUNITY
      );
    return templatesSet;
  }

  async deleteTemplatesSet(templatesSetID: string): Promise<ITemplatesSet> {
    const templatesSet = await this.getTemplatesSetOrFail(templatesSetID, {
      relations: ['authorization', 'aspectTemplates', 'canvasTemplates'],
    });

    if (templatesSet.authorization)
      await this.authorizationPolicyService.delete(templatesSet.authorization);

    if (templatesSet.aspectTemplates) {
      for (const aspectTemplate of templatesSet.aspectTemplates) {
        await this.aspectTemplateService.deleteAspectTemplate(aspectTemplate);
      }
    }
    if (templatesSet.canvasTemplates) {
      for (const canvasTemplate of templatesSet.canvasTemplates) {
        await this.canvasTemplateService.deleteCanvasTemplate(canvasTemplate);
      }
    }
    return await this.templatesSetRepository.remove(
      templatesSet as TemplatesSet
    );
  }

  async getAspectTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IAspectTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: ['aspectTemplates'],
      }
    );
    if (!templatesSetPopulated.aspectTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized: ${templatesSetPopulated.id}`,
        LogContext.COMMUNITY
      );
    }
    return templatesSetPopulated.aspectTemplates;
  }

  async createAspectTemplate(
    templatesSet: ITemplatesSet,
    aspectTemplateInput: CreateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate =
      await this.aspectTemplateService.createAspectTemplate(
        aspectTemplateInput
      );
    templatesSet.aspectTemplates = await this.getAspectTemplates(templatesSet);
    templatesSet.aspectTemplates.push(aspectTemplate);
    await this.templatesSetRepository.save(templatesSet);
    return aspectTemplate;
  }

  async updateAspectTemplate(
    templatesSet: ITemplatesSet,
    aspectTemplateInput: UpdateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate = await this.getAspectTemplateInTemplatesSetOrFail(
      templatesSet,
      aspectTemplateInput.ID
    );
    return await this.aspectTemplateService.updateAspectTemplate(
      aspectTemplate,
      aspectTemplateInput
    );
  }

  async deleteAspectTemplate(
    templatesSet: ITemplatesSet,
    deleteData: DeleteAspectTemplateOnTemplateSetInput
  ): Promise<IAspectTemplate> {
    // check the specified aspect template is in this templates set
    const aspectTemplate = await this.getAspectTemplateInTemplatesSetOrFail(
      templatesSet,
      deleteData.ID
    );
    const deletedAspectTemplate =
      await this.aspectTemplateService.deleteAspectTemplate(aspectTemplate);
    deletedAspectTemplate.id = deleteData.ID;
    return deletedAspectTemplate;
  }

  private async getAspectTemplateInTemplatesSetOrFail(
    templatesSet: ITemplatesSet,
    aspectTemplateID: string
  ): Promise<IAspectTemplate> {
    // check the specified aspect template is in this templates set
    const aspectTemplates = await this.getAspectTemplates(templatesSet);
    const aspectTemplate = aspectTemplates.find(
      aspectTemplate => aspectTemplate.id === aspectTemplateID
    );
    if (!aspectTemplate) {
      throw new EntityNotFoundException(
        `TemplatesSet (${templatesSet.id}) does not contain the specified aspectTemplate: ${aspectTemplateID}`,
        LogContext.COMMUNITY
      );
    }
    return aspectTemplate;
  }

  async getCanvasTemplates(
    templatesSet: ITemplatesSet
  ): Promise<ICanvasTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: ['canvasTemplates'],
      }
    );
    if (!templatesSetPopulated.canvasTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized: ${templatesSetPopulated.id}`,
        LogContext.COMMUNITY
      );
    }
    return templatesSetPopulated.canvasTemplates;
  }

  async createCanvasTemplate(
    templatesSet: ITemplatesSet,
    canvasTemplateInput: CreateCanvasTemplateInput
  ): Promise<ICanvasTemplate> {
    const canvasTemplate =
      await this.canvasTemplateService.createCanvasTemplate(
        canvasTemplateInput
      );
    templatesSet.canvasTemplates = await this.getCanvasTemplates(templatesSet);
    templatesSet.canvasTemplates.push(canvasTemplate);
    await this.templatesSetRepository.save(templatesSet);
    return canvasTemplate;
  }

  async updateCanvasTemplate(
    templatesSet: ITemplatesSet,
    canvasTemplateInput: UpdateCanvasTemplateInput
  ): Promise<ICanvasTemplate> {
    const canvasTemplate = await this.getCanvasTemplateInTemplatesSetOrFail(
      templatesSet,
      canvasTemplateInput.ID
    );
    return await this.canvasTemplateService.updateCanvasTemplate(
      canvasTemplate,
      canvasTemplateInput
    );
  }

  async deleteCanvasTemplate(
    templatesSet: ITemplatesSet,
    deleteData: DeleteCanvasTemplateOnTemplateSetInput
  ): Promise<ICanvasTemplate> {
    // check the specified aspect template is in this templates set
    const canvasTemplate = await this.getCanvasTemplateInTemplatesSetOrFail(
      templatesSet,
      deleteData.ID
    );
    const deletedCanvasTemplate =
      await this.canvasTemplateService.deleteCanvasTemplate(canvasTemplate);
    deletedCanvasTemplate.id = deleteData.ID;
    return deletedCanvasTemplate;
  }

  private async getCanvasTemplateInTemplatesSetOrFail(
    templatesSet: ITemplatesSet,
    canvasTemplateID: string
  ): Promise<ICanvasTemplate> {
    // check the specified aspect template is in this templates set
    const canvasTemplates = await this.getCanvasTemplates(templatesSet);
    const canvasTemplate = canvasTemplates.find(
      aspectTemplate => aspectTemplate.id === canvasTemplateID
    );
    if (!canvasTemplate) {
      throw new EntityNotFoundException(
        `TemplatesSet (${templatesSet.id}) does not contain the specified Canvas Template: ${canvasTemplateID}`,
        LogContext.COMMUNITY
      );
    }
    return canvasTemplate;
  }
}
