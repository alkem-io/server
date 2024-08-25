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
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from './templates.set.interface';
import { TemplateService } from '../template/template.service';
import { ITemplate } from '../template/template.interface';
import { CreateTemplateInput } from '../template/dto/template.dto.create';
import { WhiteboardTemplateService } from '../whiteboard-template/whiteboard.template.service';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { CreateWhiteboardTemplateInput } from '../whiteboard-template/dto/whiteboard.template.dto.create';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { CreateCalloutTemplateInput } from '../callout-template/dto/callout.template.dto.create';
import { CalloutTemplateService } from '../callout-template/callout.template.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateType } from '@common/enums/template.type';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private calloutTemplateService: CalloutTemplateService,
    private templateService: TemplateService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATES_SET
    );
    templatesSet.templates = [];
    templatesSet.whiteboardTemplates = [];

    return await this.templatesSetRepository.save(templatesSet);
  }

  async getTemplatesSetOrFail(
    templatesSetID: string,
    options?: FindOneOptions<TemplatesSet>
  ): Promise<ITemplatesSet | never> {
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
      relations: {
        authorization: true,
        templates: true,
        whiteboardTemplates: true,
        calloutTemplates: true,
      },
    });

    if (templatesSet.authorization)
      await this.authorizationPolicyService.delete(templatesSet.authorization);

    if (templatesSet.templates) {
      for (const template of templatesSet.templates) {
        await this.templateService.delete(template);
      }
    }
    if (templatesSet.whiteboardTemplates) {
      for (const whiteboardTemplate of templatesSet.whiteboardTemplates) {
        await this.whiteboardTemplateService.deleteWhiteboardTemplate(
          whiteboardTemplate
        );
      }
    }

    if (templatesSet.calloutTemplates) {
      for (const calloutTemplate of templatesSet.calloutTemplates) {
        await this.calloutTemplateService.deleteCalloutTemplate(
          calloutTemplate
        );
      }
    }

    return await this.templatesSetRepository.remove(
      templatesSet as TemplatesSet
    );
  }

  async getCalloutTemplates(
    templatesSet: ITemplatesSet
  ): Promise<ICalloutTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: {
          calloutTemplates: {
            profile: true,
          },
        },
      }
    );
    if (!templatesSetPopulated.calloutTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized as no calloutTemplates: ${templatesSetPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.calloutTemplates;
  }

  async getCommunityGuidelinesTemplates(
    templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    const innovationFlowTemplates =
      await this.templateService.getTemplateTypeInTemplatesSet(
        templatesSet.id,
        TemplateType.COMMUNITY_GUIDELINES
      );

    return innovationFlowTemplates;
  }

  public getPostTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<ITemplate> {
    return this.templateService.getTemplateOrFail(templateId, {
      relations: { templatesSet: true, profile: true },
      where: { templatesSet: { id: templatesSetId } },
    });
  }

  public getWhiteboardTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<IWhiteboardTemplate> {
    return this.whiteboardTemplateService.getWhiteboardTemplateOrFail(
      templateId,
      {
        relations: { templatesSet: true, profile: true },
        where: { templatesSet: { id: templatesSetId } },
      }
    );
  }

  async createPostTemplate(
    templatesSet: ITemplatesSet,
    templateInput: CreateTemplateInput
  ): Promise<ITemplate> {
    const newTemplateType = templateInput.type;
    templatesSet.templates = await this.getPostTemplates(templatesSet);

    const existingType = templatesSet.templates.find(
      template => template.type === newTemplateType
    );
    if (existingType) {
      throw new ValidationException(
        `PostTemplate with the provided type already exists: ${newTemplateType}`,
        LogContext.CONTEXT
      );
    }
    const storageAggregator = await this.getStorageAggregator(templatesSet);
    const template = await this.templateService.createTemplate(
      templateInput,
      storageAggregator
    );
    template.templatesSet = templatesSet;
    return await this.templateService.save(template);
  }

  async addTemplates(
    templatesSet: ITemplatesSet,
    templateInputs: CreateTemplateInput[],
    innovationFlowTemplateInputs: CreateTemplateInput[],
    storageAggregator: IStorageAggregator
  ): Promise<ITemplatesSet> {
    for (const templateDefault of templateInputs) {
      const template = await this.templateService.createTemplate(
        templateDefault,
        storageAggregator
      );
      templatesSet.templates.push(template);
    }

    for (const innovationFlowTemplateDefault of innovationFlowTemplateInputs) {
      const innovationFlowTemplate = await this.templateService.createTemplate(
        innovationFlowTemplateDefault,
        storageAggregator
      );
      templatesSet.templates.push(innovationFlowTemplate);
    }
    return await this.save(templatesSet);
  }

  private async getStorageAggregator(
    templatesSet: ITemplatesSet
  ): Promise<IStorageAggregator> {
    return await this.storageAggregatorResolverService.getStorageAggregatorForTemplatesSet(
      templatesSet.id
    );
  }

  async createCalloutTemplate(
    templatesSet: ITemplatesSet,
    calloutTemplateInput: CreateCalloutTemplateInput,
    agentInfo: AgentInfo
  ): Promise<ICalloutTemplate> {
    const storageAggregator = await this.getStorageAggregator(templatesSet);
    const calloutTemplate =
      await this.calloutTemplateService.createCalloutTemplate(
        calloutTemplateInput,
        storageAggregator,
        agentInfo
      );
    calloutTemplate.templatesSet = templatesSet;

    return await this.calloutTemplateService.save(calloutTemplate);
  }

  public async save(templatesSet: ITemplatesSet): Promise<ITemplatesSet> {
    return await this.templatesSetRepository.save(templatesSet);
  }

  async getWhiteboardTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IWhiteboardTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: {
          whiteboardTemplates: {
            profile: true,
          },
        },
      }
    );
    if (!templatesSetPopulated.whiteboardTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized: ${templatesSetPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.whiteboardTemplates;
  }

  async createWhiteboardTemplate(
    templatesSet: ITemplatesSet,
    whiteboardTemplateInput: CreateWhiteboardTemplateInput
  ): Promise<IWhiteboardTemplate> {
    templatesSet.whiteboardTemplates =
      await this.getWhiteboardTemplates(templatesSet);

    const existingWithSameName = templatesSet.whiteboardTemplates.find(
      template =>
        template.profile.displayName ===
        whiteboardTemplateInput.profile.displayName
    );
    if (existingWithSameName) {
      throw new ValidationException(
        `Whiteboard Template with the provided name already exists: ${existingWithSameName.profile.displayName}`,
        LogContext.CONTEXT
      );
    }
    const storageAggregator = await this.getStorageAggregator(templatesSet);
    const whiteboardTemplate =
      await this.whiteboardTemplateService.createWhiteboardTemplate(
        whiteboardTemplateInput,
        storageAggregator
      );
    whiteboardTemplate.templatesSet = templatesSet;
    return await this.whiteboardTemplateService.save(whiteboardTemplate);
  }

  async getInnovationFlowTemplates(
    templatesSet: ITemplatesSet
  ): Promise<ITemplate[]> {
    const innovationFlowTemplates =
      await this.templateService.getTemplateTypeInTemplatesSet(
        templatesSet.id,
        TemplateType.INNOVATION_FLOW
      );

    return innovationFlowTemplates;
  }

  async getPostTemplates(templatesSet: ITemplatesSet): Promise<ITemplate[]> {
    const innovationFlowTemplates =
      await this.templateService.getTemplateTypeInTemplatesSet(
        templatesSet.id,
        TemplateType.POST
      );

    return innovationFlowTemplates;
  }

  async getTemplatesCountForType(
    templatesSetID: string,
    type: TemplateType
  ): Promise<number> {
    return await this.templateService.getCountInTemplatesSet(
      templatesSetID,
      type
    );
  }

  async getTemplatesCount(templatesSetID: string): Promise<number> {
    const whiteboardTemplatesCount =
      await this.getWhiteboardTemplatesCount(templatesSetID);

    const postTemplatesCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.POST
      );

    const innovationFlowsCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.INNOVATION_FLOW
      );

    const calloutTemplatesCount =
      await this.getCalloutTemplatesCount(templatesSetID);

    const communityGuidelinesTemplatesCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.COMMUNITY_GUIDELINES
      );

    return (
      whiteboardTemplatesCount +
      postTemplatesCount +
      innovationFlowsCount +
      calloutTemplatesCount +
      communityGuidelinesTemplatesCount
    );
  }

  getWhiteboardTemplatesCount(templatesSetID: string): Promise<number> {
    return this.whiteboardTemplateService.getCountInTemplatesSet(
      templatesSetID
    );
  }

  getCalloutTemplatesCount(templatesSetID: string): Promise<number> {
    return this.calloutTemplateService.getCountInTemplatesSet(templatesSetID);
  }
}
