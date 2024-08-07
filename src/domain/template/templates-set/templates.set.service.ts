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
import { ICommunityGuidelinesTemplate } from '@domain/template/community-guidelines-template/community.guidelines.template.interface';
import { CreateCommunityGuidelinesTemplateInput } from '@domain/template/community-guidelines-template/dto/community.guidelines.template.dto.create';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from './templates.set.interface';
import { PostTemplateService } from '../post-template/post.template.service';
import { WhiteboardTemplateService } from '../whiteboard-template/whiteboard.template.service';
import { InnovationFlowTemplateService } from '../innovation-flow-template/innovation.flow.template.service';
import { CommunityGuidelinesTemplateService } from '../community-guidelines-template/community.guidelines.template.service';
import { IPostTemplate } from '../post-template/post.template.interface';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { IInnovationFlowTemplate } from '../innovation-flow-template/innovation.flow.template.interface';
import { CreatePostTemplateInput } from '../post-template/dto/post.template.dto.create';
import { CreateWhiteboardTemplateInput } from '../whiteboard-template/dto/whiteboard.template.dto.create';
import { CreateInnovationFlowTemplateInput } from '../innovation-flow-template/dto/innovation.flow.template.dto.create';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { CreateCalloutTemplateInput } from '../callout-template/dto/callout.template.dto.create';
import { CalloutTemplateService } from '../callout-template/callout.template.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private calloutTemplateService: CalloutTemplateService,
    private postTemplateService: PostTemplateService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private communityGuidelinesTemplateService: CommunityGuidelinesTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy();
    templatesSet.postTemplates = [];
    templatesSet.whiteboardTemplates = [];
    templatesSet.innovationFlowTemplates = [];
    templatesSet.communityGuidelinesTemplates = [];

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
        postTemplates: true,
        whiteboardTemplates: true,
        innovationFlowTemplates: true,
        communityGuidelinesTemplates: true,
        calloutTemplates: true,
      },
    });

    if (templatesSet.authorization)
      await this.authorizationPolicyService.delete(templatesSet.authorization);

    if (templatesSet.postTemplates) {
      for (const postTemplate of templatesSet.postTemplates) {
        await this.postTemplateService.deletePostTemplate(postTemplate);
      }
    }
    if (templatesSet.whiteboardTemplates) {
      for (const whiteboardTemplate of templatesSet.whiteboardTemplates) {
        await this.whiteboardTemplateService.deleteWhiteboardTemplate(
          whiteboardTemplate
        );
      }
    }
    if (templatesSet.innovationFlowTemplates) {
      for (const innovationFlowTemplate of templatesSet.innovationFlowTemplates) {
        await this.innovationFlowTemplateService.deleteInnovationFlowTemplate(
          innovationFlowTemplate
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
    if (templatesSet.communityGuidelinesTemplates) {
      for (const communityGuidelinesTemplate of templatesSet.communityGuidelinesTemplates) {
        await this.communityGuidelinesTemplateService.deleteCommunityGuidelinesTemplate(
          communityGuidelinesTemplate
        );
      }
    }
    return await this.templatesSetRepository.remove(
      templatesSet as TemplatesSet
    );
  }

  async getPostTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IPostTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: {
          postTemplates: {
            profile: true,
          },
        },
      }
    );
    if (!templatesSetPopulated.postTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized: ${templatesSetPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.postTemplates;
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

  public getCommunityGuidelinesTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<ICommunityGuidelinesTemplate> {
    return this.communityGuidelinesTemplateService.getCommunityGuidelinesTemplateOrFail(
      templateId,
      {
        where: { templatesSet: { id: templatesSetId } },
      }
    );
  }

  async getCommunityGuidelinesTemplates(
    templatesSet: ITemplatesSet
  ): Promise<ICommunityGuidelinesTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: {
          communityGuidelinesTemplates: {
            profile: true,
          },
        },
      }
    );
    if (!templatesSetPopulated.communityGuidelinesTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized: ${templatesSetPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.communityGuidelinesTemplates;
  }

  public getPostTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<IPostTemplate> {
    return this.postTemplateService.getPostTemplateOrFail(templateId, {
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

  public getInnovationFlowTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<IInnovationFlowTemplate> {
    return this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
      templateId,
      {
        relations: { templatesSet: true, profile: true },
        where: { templatesSet: { id: templatesSetId } },
      }
    );
  }

  async createPostTemplate(
    templatesSet: ITemplatesSet,
    postTemplateInput: CreatePostTemplateInput
  ): Promise<IPostTemplate> {
    const newTemplateType = postTemplateInput.type;
    templatesSet.postTemplates = await this.getPostTemplates(templatesSet);

    const existingType = templatesSet.postTemplates.find(
      template => template.type === newTemplateType
    );
    if (existingType) {
      throw new ValidationException(
        `PostTemplate with the provided type already exists: ${newTemplateType}`,
        LogContext.CONTEXT
      );
    }
    const storageAggregator = await this.getStorageAggregator(templatesSet);
    const postTemplate = await this.postTemplateService.createPostTemplate(
      postTemplateInput,
      storageAggregator
    );
    postTemplate.templatesSet = templatesSet;
    return await this.postTemplateService.save(postTemplate);
  }

  async addTemplates(
    templatesSet: ITemplatesSet,
    postTemplateInputs: CreatePostTemplateInput[],
    innovationFlowTemplateInputs: CreateInnovationFlowTemplateInput[],
    storageAggregator: IStorageAggregator
  ): Promise<ITemplatesSet> {
    for (const postTemplateDefault of postTemplateInputs) {
      const postTemplate = await this.postTemplateService.createPostTemplate(
        postTemplateDefault,
        storageAggregator
      );
      templatesSet.postTemplates.push(postTemplate);
    }

    for (const innovationFlowTemplateDefault of innovationFlowTemplateInputs) {
      const innovationFlowTemplate =
        await this.innovationFlowTemplateService.createInnovationFlowTemplate(
          innovationFlowTemplateDefault,
          storageAggregator
        );
      templatesSet.innovationFlowTemplates.push(innovationFlowTemplate);
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
    templatesSet.whiteboardTemplates = await this.getWhiteboardTemplates(
      templatesSet
    );

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

  async createCommunityGuidelinesTemplate(
    templatesSet: ITemplatesSet,
    communityGuidelinesTemplateInput: CreateCommunityGuidelinesTemplateInput
  ): Promise<ICommunityGuidelinesTemplate> {
    if (
      !communityGuidelinesTemplateInput.communityGuidelinesID &&
      !communityGuidelinesTemplateInput.communityGuidelines
    ) {
      throw new ValidationException(
        'A Community Guidelines ID or a Community Guidelines input must be provided',
        LogContext.CONTEXT
      );
    }

    templatesSet.communityGuidelinesTemplates =
      await this.getCommunityGuidelinesTemplates(templatesSet);

    const storageAggregator = await this.getStorageAggregator(templatesSet);
    const communityGuidelinesTemplate =
      await this.communityGuidelinesTemplateService.createCommunityGuidelinesTemplate(
        communityGuidelinesTemplateInput,
        storageAggregator
      );
    communityGuidelinesTemplate.templatesSet = templatesSet;
    return await this.communityGuidelinesTemplateService.save(
      communityGuidelinesTemplate
    );
  }

  async getInnovationFlowTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IInnovationFlowTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: {
          innovationFlowTemplates: {
            profile: true,
          },
        },
      }
    );
    if (!templatesSetPopulated.innovationFlowTemplates) {
      throw new EntityNotInitializedException(
        `TemplatesSet not initialized with innovation flow templates: ${templatesSetPopulated.id}`,
        LogContext.TEMPLATES
      );
    }
    return templatesSetPopulated.innovationFlowTemplates;
  }

  async deleteInnovationFlowTemplate(
    innovationFlowTemplate: IInnovationFlowTemplate
  ): Promise<IInnovationFlowTemplate> {
    return await this.innovationFlowTemplateService.deleteInnovationFlowTemplate(
      innovationFlowTemplate
    );
  }

  async createInnovationFlowTemplate(
    templatesSet: ITemplatesSet,
    innovationFlowTemplateInput: CreateInnovationFlowTemplateInput
  ): Promise<IInnovationFlowTemplate> {
    templatesSet.innovationFlowTemplates =
      await this.getInnovationFlowTemplates(templatesSet);
    const existingWithSameName = templatesSet.innovationFlowTemplates.find(
      template =>
        template.profile.displayName ===
        innovationFlowTemplateInput.profile.displayName
    );
    if (existingWithSameName) {
      throw new ValidationException(
        `InnovationFlow Template with the provided name already exists: ${existingWithSameName.profile.displayName}`,
        LogContext.CONTEXT
      );
    }
    const storageAggregator = await this.getStorageAggregator(templatesSet);
    const innovationFlowTemplate =
      await this.innovationFlowTemplateService.createInnovationFlowTemplate(
        innovationFlowTemplateInput,
        storageAggregator
      );

    innovationFlowTemplate.templatesSet = templatesSet;
    return await this.innovationFlowTemplateService.save(
      innovationFlowTemplate
    );
  }

  async getTemplatesCount(templatesSetID: string): Promise<number> {
    const whiteboardTemplatesCount = await this.getWhiteboardTemplatesCount(
      templatesSetID
    );

    const postTemplatesCount = await this.getPostTemplatesCount(templatesSetID);

    const innovationFlowsCount = await this.getInnovationFlowTemplatesCount(
      templatesSetID
    );

    const calloutTemplatesCount = await this.getCalloutTemplatesCount(
      templatesSetID
    );

    const communityGuidelinesTemplatesCount =
      await this.getCommunityGuidelinesTemplatesCount(templatesSetID);

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

  getPostTemplatesCount(templatesSetID: string): Promise<number> {
    return this.postTemplateService.getCountInTemplatesSet(templatesSetID);
  }

  getInnovationFlowTemplatesCount(templatesSetID: string): Promise<number> {
    return this.innovationFlowTemplateService.getCountInTemplatesSet(
      templatesSetID
    );
  }

  getCalloutTemplatesCount(templatesSetID: string): Promise<number> {
    return this.calloutTemplateService.getCountInTemplatesSet(templatesSetID);
  }

  getCommunityGuidelinesTemplatesCount(
    templatesSetID: string
  ): Promise<number> {
    return this.communityGuidelinesTemplateService.getCountInTemplatesSet(
      templatesSetID
    );
  }
}
