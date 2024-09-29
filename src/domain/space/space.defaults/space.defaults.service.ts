import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums/logging.context';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';
import { subspaceCommunityRoles } from './definitions/subspace.community.roles';
import { spaceCommunityRoles } from './definitions/space.community.roles';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { subspceCommunityApplicationForm } from './definitions/subspace.community.role.application.form';
import { spaceCommunityApplicationForm } from './definitions/space.community.role.application.form';
import { ProfileType } from '@common/enums';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { SpaceLevel } from '@common/enums/space.level';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { SpaceType } from '@common/enums/space.type';
import { spaceDefaultsCalloutGroupsChallenge } from './definitions/challenge/space.defaults.callout.groups.challenge';
import { spaceDefaultsCalloutGroupsOpportunity } from './definitions/oppportunity/space.defaults.callout.groups.opportunity';
import { spaceDefaultsCalloutGroupsRootSpace } from './definitions/root-space/space.defaults.callout.groups.root.space';
import { spaceDefaultsCalloutGroupsKnowledge } from './definitions/knowledge/space.defaults.callout.groups.knowledge';
import { spaceDefaultsCalloutsOpportunity } from './definitions/oppportunity/space.defaults.callouts.opportunity';
import { spaceDefaultsCalloutsChallenge } from './definitions/challenge/space.defaults.callouts.challenge';
import { spaceDefaultsCalloutsRootSpace } from './definitions/root-space/space.defaults.callouts.root.space';
import { spaceDefaultsCalloutsKnowledge } from './definitions/knowledge/space.defaults.callouts.knowledge';
import { spaceDefaultsSettingsRootSpace } from './definitions/root-space/space.defaults.settings.root.space';
import { spaceDefaultsSettingsOpportunity } from './definitions/oppportunity/space.defaults.settings.opportunity';
import { spaceDefaultsSettingsChallenge } from './definitions/challenge/space.defaults.settings.challenge';
import { spaceDefaultsSettingsKnowledge } from './definitions/knowledge/space.defaults.settings.knowledge';
import { spaceDefaultsInnovationFlowStatesChallenge } from './definitions/challenge/space.defaults.innovation.flow.challenge';
import { spaceDefaultsInnovationFlowStatesOpportunity } from './definitions/oppportunity/space.defaults.innovation.flow.opportunity';
import { spaceDefaultsInnovationFlowStatesRootSpace } from './definitions/root-space/space.defaults.innovation.flow.root.space';
import { spaceDefaultsInnovationFlowStatesKnowledge } from './definitions/knowledge/space.defaults.innovation.flow.knowledge';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';
import { spaceDefaultsCalloutGroupsBlankSlate } from './definitions/blank-slate/space.defaults.callout.groups.blank.slate';
import { spaceDefaultsCalloutsBlankSlate } from './definitions/blank-slate/space.defaults.callouts.blank.slate';
import { spaceDefaultsSettingsBlankSlate } from './definitions/blank-slate/space.defaults.settings.blank.slate';
import { spaceDefaultsInnovationFlowStatesBlankSlate } from './definitions/blank-slate/space.defaults.innovation.flow.blank.slate';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';
import { CreateCollaborationOnSpaceInput } from '../space/dto/space.dto.create.collaboration';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';

@Injectable()
export class SpaceDefaultsService {
  constructor() {}

  public async createCollaborationInput(
    collaborationData: CreateCollaborationOnSpaceInput,
    spaceType: SpaceType
  ): Promise<CreateCollaborationInput> {
    if (!collaborationData.innovationFlowData) {
      // TODO: need to pick up the default template + innovation flow properly
      collaborationData.innovationFlowData =
        await this.getDefaultInnovationFlowInput(spaceType);
    }
    if (!collaborationData.calloutsData) {
      collaborationData.calloutsData = [];
    }
    const addDefaultCallouts = collaborationData.addDefaultCallouts;
    if (addDefaultCallouts === undefined || addDefaultCallouts) {
      const defaultCallouts = this.getDefaultCallouts(spaceType);
      collaborationData.calloutsData.push(...defaultCallouts);
    }

    collaborationData.calloutGroups = this.getCalloutGroups(spaceType);
    collaborationData.defaultCalloutGroupName =
      this.getCalloutGroupDefault(spaceType);
    return collaborationData;
  }

  public getCalloutGroups(spaceType: SpaceType): ICalloutGroup[] {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
        return spaceDefaultsCalloutGroupsChallenge;
      case SpaceType.OPPORTUNITY:
        return spaceDefaultsCalloutGroupsOpportunity;
      case SpaceType.SPACE:
        return spaceDefaultsCalloutGroupsRootSpace;
      case SpaceType.KNOWLEDGE:
        return spaceDefaultsCalloutGroupsKnowledge;
      case SpaceType.BLANK_SLATE:
        return spaceDefaultsCalloutGroupsBlankSlate;
      default:
        throw new EntityNotInitializedException(
          `Invalid space type: ${spaceType}`,
          LogContext.ROLES
        );
    }
  }

  public getCalloutGroupDefault(spaceType: SpaceType): CalloutGroupName {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.KNOWLEDGE:
      case SpaceType.OPPORTUNITY:
      case SpaceType.BLANK_SLATE:
        return CalloutGroupName.HOME;
      case SpaceType.SPACE:
        return CalloutGroupName.KNOWLEDGE;
      default:
        throw new EntityNotInitializedException(
          `Invalid space type: ${spaceType}`,
          LogContext.ROLES
        );
    }
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

  public async getDefaultInnovationFlowInput(
    spaceType: SpaceType
  ): Promise<CreateInnovationFlowInput> {
    // If no default template is set, then pick up the default based on the specified type
    const innovationFlowStatesDefault =
      this.getDefaultInnovationFlowStates(spaceType);
    const result: CreateInnovationFlowInput = {
      profile: {
        displayName: 'default',
        description: 'default flow',
      },
      states: innovationFlowStatesDefault,
    };
    return result;
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

  public getDefaultCallouts(spaceType: SpaceType): CreateCalloutInput[] {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
        return spaceDefaultsCalloutsChallenge;
      case SpaceType.OPPORTUNITY:
        return spaceDefaultsCalloutsOpportunity;
      case SpaceType.SPACE:
        return spaceDefaultsCalloutsRootSpace;
      case SpaceType.KNOWLEDGE:
        return spaceDefaultsCalloutsKnowledge;
      case SpaceType.BLANK_SLATE:
        return spaceDefaultsCalloutsBlankSlate;
      default:
        throw new EntityNotInitializedException(
          `Invalid space type: ${spaceType}`,
          LogContext.ROLES
        );
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

  private getDefaultInnovationFlowStates(
    spaceType: SpaceType
  ): IInnovationFlowState[] {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
        return spaceDefaultsInnovationFlowStatesChallenge;
      case SpaceType.OPPORTUNITY:
        return spaceDefaultsInnovationFlowStatesOpportunity;
      case SpaceType.SPACE:
        return spaceDefaultsInnovationFlowStatesRootSpace;
      case SpaceType.KNOWLEDGE:
        return spaceDefaultsInnovationFlowStatesKnowledge;
      case SpaceType.BLANK_SLATE:
        return spaceDefaultsInnovationFlowStatesBlankSlate;
      default:
        throw new EntityNotInitializedException(
          `Invalid space type: ${spaceType}`,
          LogContext.ROLES
        );
    }
  }
}
