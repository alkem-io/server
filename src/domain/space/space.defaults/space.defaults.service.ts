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
import { InnovationFlowStatesService } from '@domain/collaboration/innovation-flow-states/innovaton.flow.state.service';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { ITemplatesSet } from '@domain/template/templates-set';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { IInnovationFlowTemplate } from '@domain/template/innovation-flow-template/innovation.flow.template.interface';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { templatesSetDefaults } from './definitions/space.defaults.templates';
import { innovationFlowStatesDefault } from './definitions/space.defaults.innovation.flow';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { spaceSettingsDefaults } from './definitions/space.settings';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';
import { SpaceType } from '@common/enums/space.type';
import { spaceCalloutGroups } from './definitions/space.callout.group';
import { subspaceCalloutGroups } from './definitions/subspace.callout.group';
import { Account } from '../account/account.entity';
import { subspaceDefaultCallouts } from './definitions/subspace.default.callouts';
import { subspaceCommunityPolicy } from './definitions/subspace.community.policy';
import { spaceDefaultCallouts } from './definitions/space.default.callouts';
import { spaceCommunityPolicy } from './definitions/space.community.policy';
import { ICommunityPolicyDefinition } from '@domain/community/community-policy/community.policy.definition';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { subspceCommunityApplicationForm } from './definitions/subspace.community.application.form';
import { spaceCommunityApplicationForm } from './definitions/space.community.application.form';
import { ProfileType } from '@common/enums';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { subspaceSettingsDefaults } from './definitions/subspace.settings';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private innovationFlowStatesService: InnovationFlowStatesService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(SpaceDefaults)
    private spaceDefaultsRepository: Repository<SpaceDefaults>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>
  ) {}

  public async createSpaceDefaults(): Promise<ISpaceDefaults> {
    const spaceDefaults: ISpaceDefaults = new SpaceDefaults();
    spaceDefaults.authorization = new AuthorizationPolicy();

    return spaceDefaults;
  }

  public async updateSpaceDefaults(
    spaceDefaults: ISpaceDefaults,
    innovationFlowTemplate: IInnovationFlowTemplate
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

  public async getDefaultsForAccountOrFail(
    accountID: string
  ): Promise<ISpaceDefaults | never> {
    let spaceDefaults: ISpaceDefaults | undefined = undefined;
    if (accountID.length === UUID_LENGTH) {
      const account = await this.accountRepository.findOne({
        where: { id: accountID },
        relations: {
          defaults: true,
        },
      });
      if (account) spaceDefaults = account?.defaults;
    }

    if (!spaceDefaults)
      throw new EntityNotFoundException(
        `No SpaceDefaults found for the given accountID: ${accountID}`,
        LogContext.COLLABORATION
      );
    return spaceDefaults;
  }

  public getCalloutGroups(spaceType: SpaceType): ICalloutGroup[] {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return subspaceCalloutGroups;
      case SpaceType.SPACE:
        return spaceCalloutGroups;
    }
  }

  public getCalloutGroupDefault(spaceType: SpaceType): CalloutGroupName {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return CalloutGroupName.CONTRIBUTE_2;
      case SpaceType.SPACE:
        return CalloutGroupName.KNOWLEDGE;
    }
  }

  public getCommunityPolicy(spaceType: SpaceType): ICommunityPolicyDefinition {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return subspaceCommunityPolicy;
      case SpaceType.SPACE:
        return spaceCommunityPolicy;
    }
  }

  public getProfileType(spaceType: SpaceType): ProfileType {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
        return ProfileType.CHALLENGE;
      case SpaceType.OPPORTUNITY:
        return ProfileType.OPPORTUNITY;
      case SpaceType.SPACE:
        return ProfileType.SPACE;
    }
  }

  public getCommunityApplicationForm(spaceType: SpaceType): CreateFormInput {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return subspceCommunityApplicationForm;
      case SpaceType.SPACE:
        return spaceCommunityApplicationForm;
    }
  }

  public getDefaultCallouts(spaceType: SpaceType): CreateCalloutInput[] {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return subspaceDefaultCallouts;
      case SpaceType.SPACE:
        return spaceDefaultCallouts;
    }
  }

  public getDefaultInnovationFlowTemplate(
    spaceDefaults: ISpaceDefaults
  ): IInnovationFlowTemplate | undefined {
    return spaceDefaults.innovationFlowTemplate;
  }

  public getDefaultSpaceSettings(spaceType: SpaceType): ISpaceSettings {
    switch (spaceType) {
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return subspaceSettingsDefaults;
      case SpaceType.SPACE:
        return spaceSettingsDefaults;
    }
  }

  public async getCreateInnovationFlowInput(
    accountID: string,
    innovationFlowTemplateID?: string
  ): Promise<CreateInnovationFlowInput> {
    // Start with using the provided argument
    if (innovationFlowTemplateID) {
      const template =
        await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
          innovationFlowTemplateID,
          {
            relations: { profile: true },
          }
        );
      // Note: no profile currently present, so use the one from the template for now
      const result: CreateInnovationFlowInput = {
        profile: {
          displayName: template.profile.displayName,
          description: template.profile.description,
        },
        states: this.innovationFlowStatesService.getStates(template.states),
      };
      return result;
    }

    // If no argument is provided, then use the default template for the space, if set
    const spaceDefaults = await this.getDefaultsForAccountOrFail(accountID);
    if (spaceDefaults.innovationFlowTemplate) {
      const template =
        await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
          spaceDefaults.innovationFlowTemplate.id,
          {
            relations: { profile: true },
          }
        );
      spaceDefaults.innovationFlowTemplate;
      // Note: no profile currently present, so use the one from the template for now
      const result: CreateInnovationFlowInput = {
        profile: {
          displayName: template.profile.displayName,
          description: template.profile.description,
        },
        states: this.innovationFlowStatesService.getStates(template.states),
      };
      return result;
    }

    // If no default template is set, then make up one
    const result: CreateInnovationFlowInput = {
      profile: {
        displayName: 'default',
        description: 'default flow',
      },
      states: innovationFlowStatesDefault,
    };
    return result;
  }

  public async getCreateCalloutInputs(
    defaultCallouts: CreateCalloutInput[],
    calloutsFromCollaborationTemplateInput: CreateCalloutInput[],
    collaborationData?: CreateCollaborationInput
  ): Promise<CreateCalloutInput[]> {
    let calloutInputs: CreateCalloutInput[] = [];
    const addDefaultCallouts = collaborationData?.addDefaultCallouts;
    if (addDefaultCallouts === undefined || addDefaultCallouts) {
      let calloutDefaults = defaultCallouts;
      const collaborationTemplateID =
        collaborationData?.collaborationTemplateID;
      if (collaborationTemplateID) {
        calloutDefaults = calloutsFromCollaborationTemplateInput;
      } else {
        calloutInputs = calloutDefaults;
      }
    }
    return calloutInputs;
  }

  public async addDefaultTemplatesToSpaceLibrary(
    templatesSet: ITemplatesSet,
    storageAggregator: IStorageAggregator
  ): Promise<ITemplatesSet> {
    return await this.templatesSetService.addTemplates(
      templatesSet,
      templatesSetDefaults.posts,
      templatesSetDefaults.innovationFlows,
      storageAggregator
    );
  }
}