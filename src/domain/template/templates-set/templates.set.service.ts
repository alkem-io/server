import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from './templates.set.interface';
import { IAspectTemplate } from '../aspect-template/aspect.template.interface';
import { AspectTemplateService } from '../aspect-template/aspect.template.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { templatesSetDefaults } from './templates.set.defaults';
import { CreateAspectTemplateInput } from '../aspect-template/dto/aspect.template.dto.create';
import { CanvasTemplateService } from '../canvas-template/canvas.template.service';
import { ICanvasTemplate } from '../canvas-template/canvas.template.interface';
import { CreateCanvasTemplateInput } from '../canvas-template/dto/canvas.template.dto.create';
import { ILifecycleTemplate } from '../lifecycle-template/lifecycle.template.interface';
import { CreateInnovationFlowTemplateInput } from '../lifecycle-template/dto/lifecycle.template.dto.create';
import { LifecycleTemplateService } from '../lifecycle-template/lifecycle.template.service';
import { ITemplatesSetPolicy } from '../templates-set-policy/templates.set.policy.interface';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private aspectTemplateService: AspectTemplateService,
    private canvasTemplateService: CanvasTemplateService,
    private lifecycleTemplateService: LifecycleTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(
    policy: ITemplatesSetPolicy,
    addDefaults: boolean
  ): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy();
    templatesSet.policy = this.convertPolicy(policy);
    templatesSet.aspectTemplates = [];
    templatesSet.canvasTemplates = [];
    templatesSet.lifecycleTemplates = [];

    if (addDefaults) {
      for (const aspectTemplateDefault of templatesSetDefaults.aspects) {
        const aspectTemplate =
          await this.aspectTemplateService.createAspectTemplate(
            aspectTemplateDefault
          );
        templatesSet.aspectTemplates.push(aspectTemplate);
      }

      for (const lifecycleTemplateDefault of templatesSetDefaults.lifecycles) {
        const lifecycleTemplate =
          await this.lifecycleTemplateService.createInnovationFLowTemplate(
            lifecycleTemplateDefault
          );
        templatesSet.lifecycleTemplates.push(lifecycleTemplate);
      }
    }

    return await this.templatesSetRepository.save(templatesSet);
  }

  async getTemplatesSetOrFail(
    templatesSetID: string,
    options?: FindOneOptions<TemplatesSet>
  ): Promise<ITemplatesSet> {
    const templatesSet = await TemplatesSet.findOne({
      where: { id: templatesSetID },
      ...options,
    });
    if (!templatesSet)
      throw new EntityNotFoundException(
        `TemplatesSet with id(${templatesSetID}) not found!`,
        LogContext.TEMPLATES
      );
    return templatesSet;
  }

  async deleteTemplatesSet(templatesSetID: string): Promise<ITemplatesSet> {
    const templatesSet = await this.getTemplatesSetOrFail(templatesSetID, {
      relations: [
        'authorization',
        'aspectTemplates',
        'canvasTemplates',
        'lifecycleTemplates',
      ],
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
    if (templatesSet.lifecycleTemplates) {
      for (const lifecycleTemplate of templatesSet.lifecycleTemplates) {
        await this.lifecycleTemplateService.deleteLifecycleTemplate(
          lifecycleTemplate
        );
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
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.aspectTemplates;
  }

  public getAspectTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<IAspectTemplate> {
    return this.aspectTemplateService.getAspectTemplateOrFail(templateId, {
      relations: ['templatesSet'],
      where: { templatesSet: { id: templatesSetId } },
    });
  }

  public getCanvasTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<ICanvasTemplate> {
    return this.canvasTemplateService.getCanvasTemplateOrFail(templateId, {
      relations: ['templatesSet'],
      where: { templatesSet: { id: templatesSetId } },
    });
  }

  public getLifecycleTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<ILifecycleTemplate> {
    return this.lifecycleTemplateService.getLifecycleTemplateOrFail(
      templateId,
      {
        relations: ['templatesSet'],
        where: { templatesSet: { id: templatesSetId } },
      }
    );
  }

  async createAspectTemplate(
    templatesSet: ITemplatesSet,
    aspectTemplateInput: CreateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const newTemplateType = aspectTemplateInput.type;
    templatesSet.aspectTemplates = await this.getAspectTemplates(templatesSet);

    const existingType = templatesSet.aspectTemplates.find(
      template => template.type === newTemplateType
    );
    if (existingType) {
      throw new ValidationException(
        `AspectTemplate with the provided type already exists: ${newTemplateType}`,
        LogContext.CONTEXT
      );
    }
    const aspectTemplate =
      await this.aspectTemplateService.createAspectTemplate(
        aspectTemplateInput
      );
    templatesSet.aspectTemplates.push(aspectTemplate);
    await this.templatesSetRepository.save(templatesSet);
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
        LogContext.TEMPLATES
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

  async getInnovationFlowTemplates(
    templatesSet: ITemplatesSet
  ): Promise<ILifecycleTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: ['lifecycleTemplates'],
      }
    );
    if (!templatesSetPopulated.lifecycleTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized with innovation flow templates: ${templatesSetPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.lifecycleTemplates;
  }

  async deleteInnovationFlowTemplate(
    innovationFlowTemplate: ILifecycleTemplate,
    templatesSet: ITemplatesSet
  ): Promise<ILifecycleTemplate> {
    const innovationFlowTemplates = await this.getInnovationFlowTemplates(
      templatesSet
    );
    const typeCount = innovationFlowTemplates.filter(
      t => t.type === innovationFlowTemplate.type
    ).length;
    const policy = this.getPolicy(templatesSet);

    if (typeCount <= policy.minInnovationFlow) {
      throw new ValidationException(
        `Cannot delete last lifecycle template: ${innovationFlowTemplate.id} of type ${innovationFlowTemplate.type} from templateSet: ${templatesSet.id}!`,
        LogContext.LIFECYCLE
      );
    }
    return await this.lifecycleTemplateService.deleteLifecycleTemplate(
      innovationFlowTemplate
    );
  }

  async createInnovationFlowTemplate(
    templatesSet: ITemplatesSet,
    innovationFlowTemplateInput: CreateInnovationFlowTemplateInput
  ): Promise<ILifecycleTemplate> {
    const innovationFlowTemplate =
      await this.lifecycleTemplateService.createInnovationFLowTemplate(
        innovationFlowTemplateInput
      );
    templatesSet.lifecycleTemplates = await this.getInnovationFlowTemplates(
      templatesSet
    );
    templatesSet.lifecycleTemplates.push(innovationFlowTemplate);
    await this.templatesSetRepository.save(templatesSet);
    return innovationFlowTemplate;
  }

  getPolicy(templatesSet: ITemplatesSet): ITemplatesSetPolicy {
    if (!templatesSet.policy) {
      throw new EntityNotInitializedException(
        `Unable to locate policy for TemplatesSet: ${templatesSet.id}`,
        LogContext.COMMUNITY
      );
    }
    const policy = JSON.parse(templatesSet.policy);
    return policy;
  }

  convertPolicy(policy: ITemplatesSetPolicy): string {
    return JSON.stringify(policy);
  }
}
