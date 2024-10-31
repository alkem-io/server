import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums/logging.context';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { subspaceCommunityRoles } from './definitions/subspace.community.roles';
import { spaceCommunityRoles } from './definitions/space.community.roles';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { subspceCommunityApplicationForm } from './definitions/subspace.community.role.application.form';
import { spaceCommunityApplicationForm } from './definitions/space.community.role.application.form';
import { ProfileType } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { SpaceType } from '@common/enums/space.type';
import { spaceDefaultsSettingsRootSpace } from './definitions/root-space/space.defaults.settings.root.space';
import { spaceDefaultsSettingsOpportunity } from './definitions/oppportunity/space.defaults.settings.opportunity';
import { spaceDefaultsSettingsChallenge } from './definitions/challenge/space.defaults.settings.challenge';
import { spaceDefaultsSettingsKnowledge } from './definitions/knowledge/space.defaults.settings.knowledge';
import { spaceDefaultsSettingsBlankSlate } from './definitions/blank-slate/space.defaults.settings.blank.slate';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { CreateCollaborationOnSpaceInput } from '../space/dto/space.dto.create.collaboration';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { TemplateService } from '@domain/template/template/template.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { PlatformService } from '@platform/platform/platform.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { ValidationException } from '@common/exceptions';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private templateService: TemplateService,
    private inputCreatorService: InputCreatorService,
    private platformService: PlatformService,
    private collaborationService: CollaborationService,
    private templatesManagerService: TemplatesManagerService
  ) {}

  public async createCollaborationInput(
    collaborationData: CreateCollaborationOnSpaceInput,
    spaceType: SpaceType
  ): Promise<CreateCollaborationOnSpaceInput> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();
    let templateID = collaborationData.collaborationTemplateID;
    if (!templateID) {
      switch (spaceType) {
        case SpaceType.CHALLENGE:
        case SpaceType.OPPORTUNITY: {
          const subspaceTemplate =
            await this.templatesManagerService.getTemplateFromTemplateDefault(
              platformTemplatesManager.id,
              TemplateDefaultType.PLATFORM_SUBSPACE
            );
          templateID = subspaceTemplate.id;
          break;
        }
        case SpaceType.SPACE: {
          const levelZeroTemplate =
            await this.templatesManagerService.getTemplateFromTemplateDefault(
              platformTemplatesManager.id,
              TemplateDefaultType.PLATFORM_SPACE
            );
          templateID = levelZeroTemplate.id;
          break;
        }
        case SpaceType.KNOWLEDGE: {
          const knowledgeTemplate =
            await this.templatesManagerService.getTemplateFromTemplateDefault(
              platformTemplatesManager.id,
              TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE
            );
          templateID = knowledgeTemplate.id;
          break;
        }
      }
    }
    let collaborationTemplateInput: CreateCollaborationInput | undefined =
      undefined;
    if (templateID) {
      const collaborationFromTemplate =
        await this.templateService.getCollaboration(templateID);
      collaborationTemplateInput =
        await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
          collaborationFromTemplate.id
        );
    }
    if (!collaborationData.innovationFlowData) {
      // TODO: need to pick up the default template + innovation flow properly
      if (collaborationTemplateInput) {
        collaborationData.innovationFlowData =
          collaborationTemplateInput.innovationFlowData;
      } else {
        throw new ValidationException(
          'No innovation flow data provided',
          LogContext.SPACES
        );
      }
    }
    if (collaborationTemplateInput && collaborationData.addCallouts) {
      if (!collaborationData.calloutsData) {
        collaborationData.calloutsData =
          collaborationTemplateInput?.calloutsData;
      } else if (collaborationTemplateInput?.calloutsData) {
        // The request includes the calloutsData, so merge template callouts with request callouts
        collaborationData.calloutsData.push(
          ...collaborationTemplateInput.calloutsData
        );
      }
    } else {
      collaborationData.calloutsData = [];
    }

    if (!collaborationData.calloutGroups && collaborationTemplateInput) {
      collaborationData.calloutGroups =
        collaborationTemplateInput?.calloutGroups;
    }

    // Add in tutorials if needed

    if (collaborationData.addTutorialCallouts) {
      const tutorialsTemplate =
        await this.templatesManagerService.getTemplateFromTemplateDefault(
          platformTemplatesManager.id,
          TemplateDefaultType.PLATFORM_SPACE_TUTORIALS
        );
      if (tutorialsTemplate) {
        const tutorialsCollaborationTemplate =
          await this.templateService.getCollaboration(tutorialsTemplate.id);
        const tutorialsCollaborationTemplateInput =
          await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
            tutorialsCollaborationTemplate.id
          );
        if (tutorialsCollaborationTemplateInput.calloutsData) {
          collaborationData.calloutsData?.push(
            ...tutorialsCollaborationTemplateInput.calloutsData
          );
        }
      }
    }
    if (collaborationTemplateInput) {
      collaborationData.defaultCalloutGroupName =
        collaborationTemplateInput.defaultCalloutGroupName;
    }

    // Move callouts that are not in valid groups or flowStates to the default group & first flowState
    const defaultGroupName =
      collaborationTemplateInput?.defaultCalloutGroupName;
    const defaultFlowStateName =
      collaborationData.innovationFlowData?.states?.[0]?.displayName;
    const validGroupNames = collaborationData.calloutGroups?.map(
      group => group.displayName
    );
    const validFlowStateNames =
      collaborationData.innovationFlowData?.states?.map(
        state => state.displayName
      );

    this.collaborationService.moveCalloutsToCorrectGroupAndState(
      defaultGroupName,
      defaultFlowStateName,
      validGroupNames ?? [],
      validFlowStateNames ?? [],
      collaborationData.calloutsData ?? []
    );

    return collaborationData;
  }

  public getRoleSetCommunityRoles(spaceLevel: SpaceLevel): CreateRoleInput[] {
    switch (spaceLevel) {
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY:
        return subspaceCommunityRoles;
      case SpaceLevel.SPACE:
        return spaceCommunityRoles;
      default:
        throw new EntityNotInitializedException(
          `Invalid space level: ${spaceLevel}`,
          LogContext.ROLES
        );
    }
  }

  public getProfileType(spaceLevel: SpaceLevel): ProfileType {
    switch (spaceLevel) {
      case SpaceLevel.CHALLENGE:
        return ProfileType.CHALLENGE;
      case SpaceLevel.OPPORTUNITY:
        return ProfileType.OPPORTUNITY;
      case SpaceLevel.SPACE:
        return ProfileType.SPACE;
    }
  }

  public getRoleSetCommunityApplicationForm(
    spaceLevel: SpaceLevel
  ): CreateFormInput {
    switch (spaceLevel) {
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY:
        return subspceCommunityApplicationForm;
      case SpaceLevel.SPACE:
        return spaceCommunityApplicationForm;
    }
  }

  public getDefaultSpaceSettings(spaceType: SpaceType): ISpaceSettings {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
        return spaceDefaultsSettingsChallenge;
      case SpaceType.OPPORTUNITY:
        return spaceDefaultsSettingsOpportunity;
      case SpaceType.SPACE:
        return spaceDefaultsSettingsRootSpace;
      case SpaceType.KNOWLEDGE:
        return spaceDefaultsSettingsKnowledge;
      case SpaceType.BLANK_SLATE:
        return spaceDefaultsSettingsBlankSlate;
      default:
        throw new EntityNotInitializedException(
          `Invalid space type: ${spaceType}`,
          LogContext.ROLES
        );
    }
  }
}
