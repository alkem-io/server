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
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { templatesSetDefaults } from './templates.set.defaults';
import { ITemplatesSetPolicy } from '../templates-set-policy/templates.set.policy.interface';
import { PostTemplateService } from '../post-template/post.template.service';
import { WhiteboardTemplateService } from '../whiteboard-template/whiteboard.template.service';
import { InnovationFlowTemplateService } from '../innovation-flow-template/innovation.flow.template.service';
import { IPostTemplate } from '../post-template/post.template.interface';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { IInnovationFlowTemplate } from '../innovation-flow-template/innovation.flow.template.interface';
import { CreatePostTemplateInput } from '../post-template/dto/post.template.dto.create';
import { CreateWhiteboardTemplateInput } from '../whiteboard-template/dto/whiteboard.template.dto.create';
import { CreateInnovationFlowTemplateInput } from '../innovation-flow-template/dto/innovation.flow.template.dto.create';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private postTemplateService: PostTemplateService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(
    policy: ITemplatesSetPolicy,
    addDefaults: boolean
  ): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy();
    templatesSet.policy = this.convertPolicy(policy);
    templatesSet.postTemplates = [];
    templatesSet.whiteboardTemplates = [];
    templatesSet.innovationFlowTemplates = [];

    if (addDefaults) {
      for (const postTemplateDefault of templatesSetDefaults.posts) {
        const postTemplate = await this.postTemplateService.createPostTemplate(
          postTemplateDefault
        );
        templatesSet.postTemplates.push(postTemplate);
      }

      for (const innovationFlowTemplateDefault of templatesSetDefaults.innovationFlows) {
        const innovationFlowTemplate =
          await this.innovationFlowTemplateService.createInnovationFLowTemplate(
            innovationFlowTemplateDefault
          );
        templatesSet.innovationFlowTemplates.push(innovationFlowTemplate);
      }
    }

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
      relations: [
        'authorization',
        'postTemplates',
        'whiteboardTemplates',
        'innovationFlowTemplates',
      ],
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
        relations: ['postTemplates', 'postTemplates.profile'],
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

  public getPostTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<IPostTemplate> {
    return this.postTemplateService.getPostTemplateOrFail(templateId, {
      relations: ['templatesSet', 'profile'],
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
        relations: ['templatesSet', 'profile'],
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
        relations: ['templatesSet', 'profile'],
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
    const postTemplate = await this.postTemplateService.createPostTemplate(
      postTemplateInput
    );
    templatesSet.postTemplates.push(postTemplate);
    await this.templatesSetRepository.save(templatesSet);
    return postTemplate;
  }

  async getWhiteboardTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IWhiteboardTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: ['whiteboardTemplates', 'whiteboardTemplates.profile'],
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
        `Whiteboard Template with the provided type already exists: ${existingWithSameName.profile.displayName}`,
        LogContext.CONTEXT
      );
    }
    const whiteboardTemplate =
      await this.whiteboardTemplateService.createWhiteboardTemplate(
        whiteboardTemplateInput
      );

    templatesSet.whiteboardTemplates.push(whiteboardTemplate);
    await this.templatesSetRepository.save(templatesSet);
    return whiteboardTemplate;
  }

  async getInnovationFlowTemplates(
    templatesSet: ITemplatesSet
  ): Promise<IInnovationFlowTemplate[]> {
    const templatesSetPopulated = await this.getTemplatesSetOrFail(
      templatesSet.id,
      {
        relations: [
          'innovationFlowTemplates',
          'innovationFlowTemplates.profile',
        ],
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
    innovationFlowTemplate: IInnovationFlowTemplate,
    templatesSet: ITemplatesSet
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplates = await this.getInnovationFlowTemplates(
      templatesSet
    );
    const typeCount = innovationFlowTemplates.filter(
      t => t.type === innovationFlowTemplate.type
    ).length;
    const policy = this.getPolicy(templatesSet);

    if (typeCount <= policy.minInnovationFlow) {
      throw new ValidationException(
        `Cannot delete last innovationFlow template: ${innovationFlowTemplate.id} of type ${innovationFlowTemplate.type} from templateSet: ${templatesSet.id}!`,
        LogContext.LIFECYCLE
      );
    }
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
        `InnovationFlow Template with the provided type already exists: ${existingWithSameName.profile.displayName}`,
        LogContext.CONTEXT
      );
    }
    const innovationFlowTemplate =
      await this.innovationFlowTemplateService.createInnovationFLowTemplate(
        innovationFlowTemplateInput
      );

    templatesSet.innovationFlowTemplates.push(innovationFlowTemplate);
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

  async getTemplatesCount(templatesSetID: string): Promise<number> {
    const whiteboardTemplatesCount =
      await this.whiteboardTemplateService.getCountInTemplatesSet(
        templatesSetID
      );

    const postTemplatesCount =
      await this.postTemplateService.getCountInTemplatesSet(templatesSetID);

    const innovationFlowsCount =
      await this.innovationFlowTemplateService.getCountInTemplatesSet(
        templatesSetID
      );
    return whiteboardTemplatesCount + postTemplatesCount + innovationFlowsCount;
  }
}
