import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Template } from './template.entity';
import { ITemplate } from './template.interface';
import { CreateTemplateInput } from './dto/template.dto.create';
import { UpdateTemplateInput } from './dto/template.dto.update';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateType } from '@common/enums/template.type';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovaton.flow.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ICallout } from '@domain/collaboration/callout';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { randomUUID } from 'crypto';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@Injectable()
export class TemplateService {
  constructor(
    private profileService: ProfileService,
    private innovationFlowService: InnovationFlowService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private calloutService: CalloutService,
    private whiteboardService: WhiteboardService,
    private collaborationServerice: CollaborationService,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createTemplate(
    templateData: CreateTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<ITemplate> {
    const template: ITemplate = Template.create(templateData);
    template.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATE
    );

    template.profile = await this.profileService.createProfile(
      templateData.profileData,
      ProfileType.TEMPLATE,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(template.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: templateData.tags,
    });
    this.profileService.addVisualOnProfile(
      template.profile,
      VisualType.CARD,
      templateData.visualUri
    );

    switch (template.type) {
      case TemplateType.POST:
        if (!templateData.postDefaultDescription) {
          throw new ValidationException(
            `Post Template requires default description input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        template.postDefaultDescription = templateData.postDefaultDescription;
        break;
      case TemplateType.COMMUNITY_GUIDELINES:
        if (!templateData.communityGuidelinesData) {
          throw new ValidationException(
            `Community Guidelines Template requiresthe community guidelines input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        const guidelinesInput: CreateCommunityGuidelinesInput =
          templateData.communityGuidelinesData!;

        template.communityGuidelines =
          await this.communityGuidelinesService.createCommunityGuidelines(
            guidelinesInput,
            storageAggregator
          );
        break;
      case TemplateType.COLLABORATION:
        if (!templateData.collaborationData) {
          throw new ValidationException(
            `Collaboration Template requires collaboration input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        template.collaboration =
          await this.collaborationServerice.createCollaboration(
            templateData.collaborationData!,
            storageAggregator
          );
        break;
      case TemplateType.WHITEBOARD:
        if (!templateData.whiteboard) {
          throw new ValidationException(
            `Whiteboard Template requires whitebboard input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        template.whiteboard = await this.whiteboardService.createWhiteboard(
          {
            profileData: {
              displayName: 'Whiteboard Template',
            },
            nameID: randomUUID().slice(0, 8),
            content: templateData.whiteboard.content,
          },
          storageAggregator
        );
        break;
      case TemplateType.CALLOUT:
        if (!templateData.calloutData) {
          throw new ValidationException(
            `Callout Template requires callout input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        // Ensure no comments are created on the callout
        templateData.calloutData.enableComments = false;
        templateData.calloutData.visibility = CalloutVisibility.DRAFT;
        templateData.calloutData.isTemplate = true;
        templateData.calloutData.nameID = `template-${randomUUID().slice(0, 8)}`;
        template.callout = await this.calloutService.createCallout(
          templateData.calloutData!,
          [],
          storageAggregator
        );
      default:
        throw new ValidationException(
          `unknown template type: ${template.type}`,
          LogContext.TEMPLATES
        );
    }

    return await this.templateRepository.save(template);
  }

  async getTemplateOrFail(
    templateID: string,
    options?: FindOneOptions<Template>
  ): Promise<ITemplate | never> {
    const template = await this.templateRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: templateID,
      },
    });
    if (!template)
      throw new EntityNotFoundException(
        `Not able to locate Template with the specified ID: ${templateID}`,
        LogContext.COMMUNICATION
      );
    return template;
  }

  // Only support updating the profile part of the template; not the contained entity. That should
  // be done directly using the updateXXX mutation.
  async updateTemplate(
    templateInput: ITemplate,
    templateData: UpdateTemplateInput
  ): Promise<ITemplate> {
    const template = await this.getTemplateOrFail(templateInput.id, {
      relations: {
        profile: true,
      },
    });

    if (templateData.profile) {
      template.profile = await this.profileService.updateProfile(
        template.profile,
        templateData.profile
      );
    }
    if (
      template.type === TemplateType.POST &&
      templateData.postDefaultDescription
    ) {
      template.postDefaultDescription = templateData.postDefaultDescription;
    }

    return await this.templateRepository.save(template);
  }

  async delete(templateInput: ITemplate): Promise<ITemplate> {
    const template = await this.getTemplateOrFail(templateInput.id, {
      relations: {
        profile: true,
        communityGuidelines: true,
        callout: true,
        whiteboard: true,
        innovationFlow: true,
      },
    });

    if (!template.profile || !template.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with entities at start of delete: ${templateInput.id} `,
        LogContext.SPACES
      );
    }
    switch (template.type) {
      case TemplateType.COMMUNITY_GUIDELINES:
        if (!template.communityGuidelines) {
          throw new RelationshipNotFoundException(
            `Unable to load Guidelines on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.communityGuidelinesService.deleteCommunityGuidelines(
          template.communityGuidelines.id
        );
        break;
      case TemplateType.CALLOUT:
        if (!template.callout) {
          throw new RelationshipNotFoundException(
            `Unable to load Callout on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.calloutService.deleteCallout(template.callout.id);
        break;
      case TemplateType.WHITEBOARD:
        if (!template.whiteboard) {
          throw new RelationshipNotFoundException(
            `Unable to load Whiteboard on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.whiteboardService.deleteWhiteboard(template.whiteboard.id);
        break;
      case TemplateType.COLLABORATION:
        if (!template.collaboration) {
          throw new RelationshipNotFoundException(
            `Unable to load Collaboration on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.collaborationServerice.deleteCollaboration(
          template.collaboration.id
        );
        break;
      case TemplateType.INNOVATION_FLOW:
        if (!template.innovationFlow) {
          throw new RelationshipNotFoundException(
            `Unable to load InnovationFlow on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.innovationFlowService.deleteInnovationFlow(
          template.innovationFlow.id
        );
        break;
      default:
        throw new EntityNotFoundException(
          `Unable to delete template of type: ${template.type}`,
          LogContext.TEMPLATES
        );
    }

    const templateId: string = template.id;
    await this.profileService.deleteProfile(template.profile.id);

    const result = await this.templateRepository.remove(template as Template);
    result.id = templateId;
    return result;
  }

  async save(template: ITemplate): Promise<ITemplate> {
    return await this.templateRepository.save(template);
  }

  async getCountInTemplatesSet(
    templatesSetID: string,
    type: TemplateType
  ): Promise<number> {
    return await this.templateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
      type: type,
    });
  }
  async getTemplatesInTemplatesSet(
    templatesSetID: string
  ): Promise<ITemplate[]> {
    return await this.templateRepository.find({
      where: {
        templatesSet: {
          id: templatesSetID,
        },
      },
      relations: {
        profile: true,
      },
    });
  }

  async getTemplateTypeInTemplatesSet(
    templatesSetID: string,
    type: TemplateType
  ): Promise<ITemplate[]> {
    return await this.templateRepository.find({
      where: {
        templatesSet: {
          id: templatesSetID,
        },
        type: type,
      },
      relations: {
        profile: true,
      },
    });
  }

  async getTemplateByNameIDInTemplatesSetOrFail(
    templatesSetID: string,
    templateNameId: string
  ): Promise<ITemplate> {
    const template = await this.templateRepository.findOne({
      where: {
        templatesSet: {
          id: templatesSetID,
        },
        nameID: templateNameId,
      },
    });

    if (!template) {
      throw new EntityNotFoundException(
        `Templates with NameID (${templateNameId}) not found in templatesSet with ID: ${templatesSetID}!`,
        LogContext.TEMPLATES
      );
    }
    return template;
  }

  async getCommunityGuidelines(
    templateID: string
  ): Promise<ICommunityGuidelines> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        communityGuidelines: true,
      },
    });
    if (!template.communityGuidelines) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Community Guidelines: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.communityGuidelines;
  }

  async getCallout(templateID: string): Promise<ICallout> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        callout: true,
      },
    });
    if (!template.callout) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Callout: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.callout;
  }

  async getWhiteboard(templateID: string): Promise<IWhiteboard> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        whiteboard: true,
      },
    });
    if (!template.whiteboard) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Whiteboard: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.whiteboard;
  }

  async getCollaboration(templateID: string): Promise<ICollaboration> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        collaboration: true,
      },
    });
    if (!template.collaboration) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Collaboration: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.collaboration;
  }

  public async getInnovationFlow(templateID: string): Promise<IInnovationFlow> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        innovationFlow: true,
      },
    });
    if (!template.innovationFlow) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with InnovationFlow: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.innovationFlow;
  }
}
