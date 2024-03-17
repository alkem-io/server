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
import { Space } from '../space/space.entity';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { ITemplatesSet } from '@domain/template/templates-set';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { IInnovationFlowTemplate } from '@domain/template/innovation-flow-template/innovation.flow.template.interface';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow';
import { templatesSetDefaults } from './definitions/space.defaults.templates';
import { innovationFlowStatesDefault } from './definitions/space.defaults.innovation.flow';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { spaceSettingsDefaults } from './definitions/space.settings';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private innovationFlowStatesService: InnovationFlowStatesService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private templatesSetService: TemplatesSetService,
    @InjectRepository(SpaceDefaults)
    private spaceDefaultsRepository: Repository<SpaceDefaults>,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>
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

  public async getSpaceDefaultsForSpaceOrFail(
    spaceID: string
  ): Promise<ISpaceDefaults | never> {
    let spaceDefaults: ISpaceDefaults | undefined = undefined;
    if (spaceID.length === UUID_LENGTH) {
      const space = await this.spaceRepository.findOne({
        where: { id: spaceID },
        relations: {
          defaults: true,
        },
      });
      if (space) spaceDefaults = space?.defaults;
    }

    if (!spaceDefaults)
      throw new EntityNotFoundException(
        `No SpaceDefaults found for the given space ID: ${spaceID}`,
        LogContext.COLLABORATION
      );
    return spaceDefaults;
  }

  public getDefaultInnovationFlowTemplate(
    spaceDefaults: ISpaceDefaults
  ): IInnovationFlowTemplate | undefined {
    return spaceDefaults.innovationFlowTemplate;
  }

  public getDefaultSpaceSettings(): ISpaceSettings {
    return spaceSettingsDefaults;
  }

  public async getCreateInnovationFlowInput(
    spaceID: string,
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
    const spaceDefaults = await this.getSpaceDefaultsForSpaceOrFail(spaceID);
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

  public async addDefaultTemplatesToSpace(
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
