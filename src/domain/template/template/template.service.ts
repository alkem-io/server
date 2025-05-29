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
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { randomUUID } from 'crypto';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { TemplateDefault } from '../template-default/template.default.entity';
import { UpdateTemplateFromSpaceInput } from './dto/template.dto.update.from.space';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { ITemplateContentSpace } from '../template-content-space/template.content.space.interface';
import { TemplateContentSpaceService } from '../template-content-space/template.content.space.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { ISpace } from '@domain/space/space/space.interface';

@Injectable()
export class TemplateService {
  constructor(
    private profileService: ProfileService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private inputCreatorService: InputCreatorService,
    private innovationFlowService: InnovationFlowService,
    private calloutService: CalloutService,
    private whiteboardService: WhiteboardService,
    private templateContentSpaceService: TemplateContentSpaceService,
    private calloutsSetService: CalloutsSetService,
    private spaceLookupService: SpaceLookupService,
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
    await this.profileService.addVisualsOnProfile(
      template.profile,
      templateData.profileData.visuals,
      [VisualType.CARD]
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
      case TemplateType.SPACE: {
        if (!templateData.spaceData) {
          throw new ValidationException(
            `Space Template requires space input: ${JSON.stringify(templateData)}`,
            LogContext.TEMPLATES
          );
        }
        const spaceData = templateData.spaceData;
        const collaborationData = spaceData.collaborationData;
        // Mark as a template
        collaborationData.isTemplate = true;

        // Ensure that the collaboration has a default callouts setup
        if (!collaborationData.calloutsSetData) {
          collaborationData.calloutsSetData = {};
        }
        if (!collaborationData.calloutsSetData.calloutsData) {
          collaborationData.calloutsSetData.calloutsData = [];
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
            settings: {
              maximumNumberOfStates: 8,
              minimumNumberOfStates: 1,
            },
          };
        }
        // Ensure no comments are created on the callouts, and that all callouts are marked as Templates
        collaborationData.calloutsSetData.calloutsData.forEach(calloutData => {
          calloutData.isTemplate = true;
          calloutData.enableComments = false;
        });
        template.space =
          await this.templateContentSpaceService.createTemplateContentSpace(
            spaceData!,
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
            profile: {
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
        LogContext.TEMPLATES
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
        type: true,
        nameID: true,
        postDefaultDescription: templateInput.type === TemplateType.POST,
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
      // If we don't update the content here, the whiteboard will is overwritten with the old content
      template.whiteboard.content = templateData.whiteboardContent;
    }

    return await this.templateRepository.save(template);
  }

  public async updateTemplateFromSpace(
    templateInput: ITemplate,
    templateData: UpdateTemplateFromSpaceInput,
    userID: string
  ): Promise<ITemplate> {
    if (!templateInput.space || !templateInput.space.collaboration) {
      throw new RelationshipNotFoundException(
        `Unable to updateTemplate as not all entities are loaded: ${templateInput.id} `,
        LogContext.TEMPLATES
      );
    }
    const sourceSpace = await this.spaceLookupService.getSpaceOrFail(
      templateData.spaceID,
      {
        relations: {
          collaboration: {
            innovationFlow: true,
            calloutsSet: {
              callouts: true,
            },
          },
        },
      }
    );

    if (
      templateInput.space.collaboration.calloutsSet &&
      templateInput.space.collaboration.calloutsSet.callouts &&
      templateInput.space.collaboration.calloutsSet.callouts.length > 0
    ) {
      for (const callout of templateInput.space.collaboration.calloutsSet
        .callouts) {
        await this.calloutService.deleteCallout(callout.id);
      }
      templateInput.space.collaboration.calloutsSet.callouts = [];
    }

    templateInput.space = await this.updateTemplateContentSpaceFromSpace(
      sourceSpace,
      templateInput.space,
      true,
      userID
    );

    return await this.getTemplateOrFail(templateInput.id);
  }

  public async updateTemplateContentSpaceFromSpace(
    space: ISpace,
    templateContentSpace: ITemplateContentSpace,
    addCallouts: boolean,
    userID: string
  ): Promise<ITemplateContentSpace> {
    if (
      !space.collaboration ||
      !space.collaboration.innovationFlow ||
      !space.collaboration.calloutsSet?.callouts ||
      !templateContentSpace.collaboration?.innovationFlow ||
      !templateContentSpace.collaboration?.calloutsSet?.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Template cannot be applied on entities not fully loaded space.id:'${space.id}' temmplateContentSpace.id='${templateContentSpace.id}'`,
        LogContext.TEMPLATES
      );
    }

    // TODO: expand this to also take over the settings + the about
    const newStates = space.collaboration.innovationFlow.states;
    templateContentSpace.collaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        templateContentSpace.collaboration.innovationFlow,
        newStates
      );

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCollaboration(
        templateContentSpace.collaboration.id
      );
    if (addCallouts) {
      const calloutsFromSourceCollaboration =
        await this.inputCreatorService.buildCreateCalloutInputsFromCallouts(
          space.collaboration.calloutsSet.callouts ?? []
        );

      const newCallouts = await this.calloutsSetService.addCallouts(
        templateContentSpace.collaboration.calloutsSet,
        calloutsFromSourceCollaboration,
        storageAggregator,
        userID
      );
      templateContentSpace.collaboration.calloutsSet.callouts?.push(
        ...newCallouts
      );
    }

    this.ensureCalloutsInValidGroupsAndStates(
      templateContentSpace.collaboration
    );

    // Need to save before applying authorization policy to get the callout ids
    return await this.templateContentSpaceService.save(templateContentSpace);
  }

  public async updateCollaborationFromTemplateContentSpace(
    targetCollaboration: ICollaboration,
    templateContentSpace: ITemplateContentSpace,
    addCallouts: boolean,
    userID: string
  ): Promise<ICollaboration> {
    const sourceCollaboration = templateContentSpace.collaboration;
    if (
      !targetCollaboration ||
      !targetCollaboration.innovationFlow ||
      !targetCollaboration.calloutsSet?.callouts ||
      !sourceCollaboration?.innovationFlow ||
      !sourceCollaboration?.calloutsSet?.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Template cannot be applied on entities not fully loaded space.id:'${targetCollaboration.id}' templateContentSpace.id='${templateContentSpace.id}'`,
        LogContext.TEMPLATES
      );
    }

    const newStates = sourceCollaboration.innovationFlow.states;
    targetCollaboration.innovationFlow =
      await this.innovationFlowService.updateInnovationFlowStates(
        targetCollaboration.innovationFlow,
        newStates
      );

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCollaboration(
        targetCollaboration.id
      );
    if (addCallouts) {
      const calloutsFromSourceCollaboration =
        await this.inputCreatorService.buildCreateCalloutInputsFromCallouts(
          sourceCollaboration.calloutsSet.callouts ?? []
        );

      const newCallouts = await this.calloutsSetService.addCallouts(
        targetCollaboration.calloutsSet,
        calloutsFromSourceCollaboration,
        storageAggregator,
        userID
      );
      targetCollaboration.calloutsSet.callouts?.push(...newCallouts);
    }

    this.ensureCalloutsInValidGroupsAndStates(targetCollaboration);

    // Need to save before applying authorization policy to get the callout ids
    return await this.collaborationService.save(targetCollaboration);
  }

  private ensureCalloutsInValidGroupsAndStates(
    targetCollaboration: ICollaboration
  ) {
    // We don't have callouts or we don't have innovationFlow, can't do anything
    if (
      !targetCollaboration.innovationFlow ||
      !targetCollaboration.calloutsSet?.callouts
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Callouts or InnovationFlow ${targetCollaboration.id} `,
        LogContext.TEMPLATES
      );
    }

    const validFlowStates = targetCollaboration.innovationFlow.states?.map(
      state => state.displayName
    );

    this.calloutsSetService.moveCalloutsToDefaultFlowState(
      validFlowStates ?? [],
      targetCollaboration.calloutsSet?.callouts
    );
  }

  async delete(templateInput: ITemplate): Promise<ITemplate> {
    const template = await this.getTemplateOrFail(templateInput.id, {
      relations: {
        profile: true,
        communityGuidelines: true,
        callout: true,
        whiteboard: true,
        space: true,
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
      case TemplateType.SPACE: {
        if (!template.space) {
          throw new RelationshipNotFoundException(
            `Unable to load Space content on Template: ${templateInput.id} `,
            LogContext.TEMPLATES
          );
        }
        await this.templateContentSpaceService.deleteTemplateContentSpaceOrFail(
          template.space.id
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

  async getTemplateContentSpace(
    templateID: string
  ): Promise<ITemplateContentSpace> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        space: true,
      },
    });
    if (!template.space) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Space content: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.space;
  }

  async getSpace(templateID: string): Promise<ITemplateContentSpace> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        space: true,
      },
    });
    if (!template.space) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Space content: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.space;
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
