import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
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
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
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
import { TemplateDefault } from '../template-default/template.default.entity';
import { CalloutGroupName } from '@common/enums/callout.group.name';

@Injectable()
export class TemplateService {
  constructor(
    private profileService: ProfileService,
    private innovationFlowService: InnovationFlowService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private calloutService: CalloutService,
    private whiteboardService: WhiteboardService,
    private collaborationService: CollaborationService,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
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
      case TemplateType.POST: {
        if (!templateData.postDefaultDescription) {
          throw new ValidationException(
            `Post Template requires default description input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        template.postDefaultDescription = templateData.postDefaultDescription;
        break;
      }
      case TemplateType.COMMUNITY_GUIDELINES: {
        if (!templateData.communityGuidelinesData) {
          throw new ValidationException(
            `Community Guidelines Template requires the community guidelines input: ${JSON.stringify(templateData)}`,
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
      }
      case TemplateType.COLLABORATION: {
        if (!templateData.collaborationData) {
          throw new ValidationException(
            `Collaboration Template requires collaboration input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        const collaborationData = templateData.collaborationData;
        // Mark as a template
        collaborationData.isTemplate = true;

        // Ensure that the collaboration has a default callouts setup
        if (!collaborationData.calloutsData) {
          collaborationData.calloutsData = [];
        }
        if (
          !collaborationData.calloutGroups ||
          !collaborationData.defaultCalloutGroupName
        ) {
          collaborationData.defaultCalloutGroupName = CalloutGroupName.HOME;
          collaborationData.calloutGroups = [
            {
              displayName: CalloutGroupName.HOME,
              description: 'Home Callout Group',
            },
          ];
        }
        if (!collaborationData.innovationFlowData) {
          collaborationData.innovationFlowData = {
            states: [
              {
                displayName: 'Default state',
              },
            ],
            profile: {
              displayName: 'Default Innovation Flow State',
            },
          };
        }
        // Ensure no comments are created on the callouts, and that all callouts are marked as Templates
        collaborationData.calloutsData.forEach(calloutData => {
          calloutData.isTemplate = true;
          calloutData.enableComments = false;
        });
        template.collaboration =
          await this.collaborationService.createCollaboration(
            collaborationData!,
            storageAggregator
          );

        break;
      }
      case TemplateType.WHITEBOARD: {
        if (!templateData.whiteboard) {
          throw new ValidationException(
            `Whiteboard Template requires whiteboard input: ${JSON.stringify(templateData)}`,
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
      }
      case TemplateType.CALLOUT: {
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
        break;
      }
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
    /* TODO: This should be a findOne, but we have to use find because of a bug in TypeORM.
     * updateTemplate makes use of this method and the select option to only fetch the whiteboard.id
     * is causing an MySQL error with findOne which is not happening with find.
     * When we tackle #4106 (Typeorm upgrade) we can switch back to findOne
     */
    const templates = await this.templateRepository.find({
      ...options,
      where: {
        ...options?.where,
        id: templateID,
      },
    });
    if (templates.length !== 1)
      throw new EntityNotFoundException(
        `Not able to locate Template with the specified ID: ${templateID}`,
        LogContext.COMMUNICATION
      );
    return templates[0];
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
        whiteboard: templateInput.type === TemplateType.WHITEBOARD,
      },
      select: {
        id: true,
        whiteboard:
          templateInput.type === TemplateType.WHITEBOARD
            ? {
                id: true,
              }
            : undefined,
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
    if (
      template.type === TemplateType.WHITEBOARD &&
      template.whiteboard &&
      templateData.whiteboardContent
    ) {
      await this.whiteboardService.updateWhiteboardContent(
        template.whiteboard.id,
        templateData.whiteboardContent
      );
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
      case TemplateType.COMMUNITY_GUIDELINES: {
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
      }
      case TemplateType.CALLOUT: {
        if (!template.callout) {
          throw new RelationshipNotFoundException(
            `Unable to load Callout on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.calloutService.deleteCallout(template.callout.id);
        break;
      }
      case TemplateType.WHITEBOARD: {
        if (!template.whiteboard) {
          throw new RelationshipNotFoundException(
            `Unable to load Whiteboard on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.whiteboardService.deleteWhiteboard(template.whiteboard.id);
        break;
      }
      case TemplateType.COLLABORATION: {
        if (!template.collaboration) {
          throw new RelationshipNotFoundException(
            `Unable to load Collaboration on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.collaborationService.deleteCollaboration(
          template.collaboration.id
        );
        break;
      }
      case TemplateType.INNOVATION_FLOW: {
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
      }
      case TemplateType.POST: {
        // Nothing to do
        break;
      }
      default: {
        throw new EntityNotFoundException(
          `Template type not recognized '${template.type}' when deleting template: ${template.id}`,
          LogContext.TEMPLATES
        );
      }
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
  public async isTemplateInUseInTemplateDefault(
    templateID: string
  ): Promise<boolean> {
    const templateDefaults = await this.entityManager.find(TemplateDefault, {
      where: {
        template: {
          id: templateID,
        },
      },
    });
    if (templateDefaults.length > 0) {
      return true;
    }
    return false;
  }
}
