import { Injectable } from '@nestjs/common';
import { ISpaceDefaults } from './space.defaults.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceDefaults } from './space.defaults.entity';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';
import { subspaceCommunityPolicy } from './definitions/subspace.community.policy';
import { spaceCommunityPolicy } from './definitions/space.community.policy';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { subspceCommunityApplicationForm } from './definitions/subspace.community.application.form';
import { spaceCommunityApplicationForm } from './definitions/space.community.application.form';
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
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ITemplate } from '@domain/template/template/template.interface';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(SpaceDefaults)
    private spaceDefaultsRepository: Repository<SpaceDefaults>
  ) {}

  public async createSpaceDefaults(): Promise<ISpaceDefaults> {
    const spaceDefaults: ISpaceDefaults = new SpaceDefaults();
    spaceDefaults.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.SPACE_DEFAULTS
    );

    return spaceDefaults;
  }

  public async updateSpaceDefaults(
    spaceDefaults: ISpaceDefaults,
    innovationFlowTemplate: ITemplate
  ): Promise<ISpaceDefaults> {
    spaceDefaults.innovationFlowTemplate = innovationFlowTemplate;

    return await this.save(spaceDefaults);
  }

  async deleteSpaceDefaults(spaceDefaultsId: string): Promise<ISpaceDefaults> {
    const spaceDefaults = await this.getSpaceDefaultsOrFail(spaceDefaultsId, {
      relations: {
        authorization: true,
      },
    });

    if (spaceDefaults.authorization) {
      await this.authorizationPolicyService.delete(spaceDefaults.authorization);
    }

    // Note: do not remove the innovation flow template here, as that is the responsibility of the Space Library

    const result = await this.spaceDefaultsRepository.remove(
      spaceDefaults as SpaceDefaults
    );
    result.id = spaceDefaultsId;
    return result;
  }

  async save(spaceDefaults: ISpaceDefaults): Promise<ISpaceDefaults> {
    return await this.spaceDefaultsRepository.save(spaceDefaults);
  }

  public async getSpaceDefaultsOrFail(
    spaceDefaultsID: string,
    options?: FindOneOptions<SpaceDefaults>
  ): Promise<ISpaceDefaults | never> {
    let spaceDefaults: ISpaceDefaults | null = null;
    if (spaceDefaultsID.length === UUID_LENGTH) {
      spaceDefaults = await this.spaceDefaultsRepository.findOne({
        where: { id: spaceDefaultsID },
        ...options,
      });
    }

    if (!spaceDefaults)
      throw new EntityNotFoundException(
        `No SpaceDefaults found with the given id: ${spaceDefaultsID}`,
        LogContext.COLLABORATION
      );
    return spaceDefaults;
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

  public getCommunityPolicy(
    spaceLevel: SpaceLevel
  ): ICommunityPolicyDefinition {
    switch (spaceLevel) {
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY:
        return subspaceCommunityPolicy;
      case SpaceLevel.SPACE:
        return spaceCommunityPolicy;
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

  public getCommunityApplicationForm(spaceLevel: SpaceLevel): CreateFormInput {
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

  public getDefaultInnovationFlowTemplate(
    spaceDefaults: ISpaceDefaults
  ): ITemplate | undefined {
    return spaceDefaults.innovationFlowTemplate;
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

  public getDefaultInnovationFlowStates(
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
