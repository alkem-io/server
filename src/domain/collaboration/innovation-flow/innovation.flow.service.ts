import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.state.select';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.update';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { UpdateTagsetTemplateDefinitionInput } from '@domain/common/tagset-template';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { UpdateInnovationFlowStatesSortOrderInput } from './dto/innovation.flow.dto.update.states.sort.order';
import { keyBy } from 'lodash';
import { DeleteStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.delete';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private tagsetTemplateService: TagsetTemplateService,
    private innovationFlowStateService: InnovationFlowStateService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput,
    storageAggregator: IStorageAggregator,
    flowTagsetTemplate?: ITagsetTemplate,
    isTemplate: boolean = false
  ): Promise<IInnovationFlow> {
    const innovationFlow: IInnovationFlow = InnovationFlow.create({
      settings: innovationFlowData.settings,
    });
    innovationFlow.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_FLOW
    );
    if (innovationFlowData.states.length === 0) {
      throw new ValidationException(
        `Require at least one state to create an InnovationFlow: ${innovationFlowData}`,
        LogContext.INNOVATION_FLOW
      );
    }

    if (!isTemplate) {
      if (!flowTagsetTemplate) {
        throw new ValidationException(
          `Require flowTagsetTemplate on non-template InnovationFlow: ${innovationFlowData}`,
          LogContext.INNOVATION_FLOW
        );
      }
      innovationFlow.flowStatesTagsetTemplate = flowTagsetTemplate;
    }

    this.validateInnovationFlowDefinition(
      innovationFlowData.states,
      innovationFlowData.settings
    );

    innovationFlow.profile = await this.profileService.createProfile(
      innovationFlowData.profile,
      ProfileType.INNOVATION_FLOW,
      storageAggregator
    );

    await this.profileService.addVisualsOnProfile(
      innovationFlow.profile,
      innovationFlowData.profile.visuals,
      [VisualType.CARD]
    );

    innovationFlow.states = [];
    for (const stateData of innovationFlowData.states) {
      const state =
        await this.innovationFlowStateService.createInnovationFlowState(
          stateData
        );
      innovationFlow.states.push(state);
    }

    innovationFlow.currentState = innovationFlow.states[0];

    return innovationFlow;
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async updateInnovationFlow(
    innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: {
          profile: true,
          flowStatesTagsetTemplate: {
            tagsets: true,
          },
        },
      }
    );

    if (innovationFlowData.profileData) {
      innovationFlow.profile = await this.profileService.updateProfile(
        innovationFlow.profile,
        innovationFlowData.profileData
      );
    }

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  public async updateInnovationFlowStates(
    innovationFlow: IInnovationFlow,
    newStates: CreateInnovationFlowStateInput[],
    isTemplate: boolean = false
  ) {
    const selectedStateName = innovationFlow.currentState.displayName;
    // delete the existing states
    for (const state of innovationFlow.states) {
      await this.innovationFlowStateService.delete(state);
    }
    innovationFlow.states = [];
    // create the new states
    for (const stateData of newStates) {
      const state =
        await this.innovationFlowStateService.createInnovationFlowState(
          stateData
        );
      state.innovationFlow = innovationFlow;
      innovationFlow.states.push(state);
    }
    // Update the innovation flow entity
    const currentStateStillValid = innovationFlow.states.find(
      state => state.displayName === selectedStateName
    );
    if (currentStateStillValid) {
      innovationFlow.currentState = currentStateStillValid;
    } else {
      // If the current state is not valid, set it to the first state
      innovationFlow.currentState = innovationFlow.states[0];
    }

    innovationFlow = await this.save(innovationFlow);

    if (!isTemplate) {
      const tagsetAllowedValues = newStates.map(state => state.displayName);
      const tagsetDefaultSelectedValue =
        innovationFlow.currentState.displayName;
      await this.updateFlowStatesTagsetTemplate(
        innovationFlow.id,
        tagsetAllowedValues,
        tagsetDefaultSelectedValue
      );
    }

    return innovationFlow;
  }

  private async updateFlowStatesTagsetTemplate(
    innovationFlowID: string,
    allowedValues: string[],
    defaultSelectedValue: string
  ) {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: {
          flowStatesTagsetTemplate: {
            tagsets: true,
          },
        },
      }
    );
    if (
      !innovationFlow.flowStatesTagsetTemplate ||
      !innovationFlow.flowStatesTagsetTemplate.tagsets
    ) {
      throw new RelationshipNotFoundException(
        `Unable to find flowStatesTagsetTemplate on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const tagsetsToUpdate = innovationFlow.flowStatesTagsetTemplate.tagsets;
    // Update the tagset Template

    const updatedTagsetTemplateData: UpdateTagsetTemplateDefinitionInput = {
      allowedValues,
      defaultSelectedValue,
    };
    await this.tagsetTemplateService.updateTagsetTemplateDefinition(
      innovationFlow.flowStatesTagsetTemplate,
      updatedTagsetTemplateData
    );

    // Update all tagsets using the tagset template
    await this.tagsetService.updateTagsetsSelectedValue(
      tagsetsToUpdate,
      allowedValues,
      defaultSelectedValue
    );
  }

  public async createStateOnInnovationFlow(
    innovationFlow: IInnovationFlow,
    stateData: CreateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const maximumNumberOfStates = innovationFlow.settings.maximumNumberOfStates;
    if (!innovationFlow.states) {
      throw new RelationshipNotFoundException(
        `Unable to find states on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    if (innovationFlow.states.length >= maximumNumberOfStates) {
      throw new ValidationException(
        `Innovation Flow can have a maximum of ${maximumNumberOfStates} states; provided: ${innovationFlow.states.length}`,
        LogContext.INNOVATION_FLOW
      );
    }
    // If order is not specified, set it to the next highest
    if (!stateData.sortOrder) {
      stateData.sortOrder =
        innovationFlow.states.length > 0
          ? Math.max(...innovationFlow.states.map(state => state.sortOrder)) + 1
          : 1;
    }

    const state =
      await this.innovationFlowStateService.createInnovationFlowState(
        stateData
      );
    state.innovationFlow = innovationFlow;
    return await this.innovationFlowStateService.save(state);
  }

  public async deleteStateOnInnovationFlow(
    innovationFlow: IInnovationFlow,
    stateData: DeleteStateOnInnovationFlowInput
  ): Promise<IInnovationFlowState> {
    const minimum = innovationFlow.settings.minimumNumberOfStates;
    if (!innovationFlow.states) {
      throw new RelationshipNotFoundException(
        `Unable to find states on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    if (innovationFlow.states.length <= minimum) {
      throw new ValidationException(
        `Innovation Flow must have a maximum of ${minimum} states; provided: ${innovationFlow.states.length}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const state: IInnovationFlowState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        stateData.ID
      );
    return await this.innovationFlowStateService.delete(state);
  }

  public validateInnovationFlowDefinition(
    states: CreateInnovationFlowStateInput[] | UpdateInnovationFlowStateInput[],
    settings?: IInnovationFlowSettings
  ) {
    if (states.length === 0) {
      throw new ValidationException(
        `At least one state must be defined: ${states}`,
        LogContext.INNOVATION_FLOW
      );
    }
    if (settings) {
      if (states.length > settings.maximumNumberOfStates) {
        throw new ValidationException(
          `Innovation Flow can have a maximum of ${settings.maximumNumberOfStates} states; provided: ${states}`,
          LogContext.INNOVATION_FLOW
        );
      }

      if (states.length < settings.minimumNumberOfStates) {
        throw new ValidationException(
          `Innovation Flow must have a minimum of ${settings.minimumNumberOfStates} states; provided: ${states}`,
          LogContext.INNOVATION_FLOW
        );
      }
    }
    const stateNames = states.map(state => state.displayName);
    const uniqueStateNames = new Set(stateNames);
    if (uniqueStateNames.size !== stateNames.length) {
      throw new ValidationException(
        `State names must be unique: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
    // Avoid commas in state names, because they are used to separate states in the database
    // This validation is also performed on the client: domain/collaboration/InnovationFlow/InnovationFlowDragNDropEditor/InnovationFlowStateForm.tsx
    // Keep them in sync consistently
    if (stateNames.some(name => name.includes(','))) {
      throw new ValidationException(
        `Invalid characters found on flow state: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
  }

  async updateSelectedState(
    innovationFlowSelectedStateData: UpdateInnovationFlowSelectedStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: { profile: true, flowStatesTagsetTemplate: true },
      }
    );
    const newSelectedState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        innovationFlowSelectedStateData.selectedStateID
      );

    // Check it is part of the current flow states!
    if (
      !innovationFlow.states.some(state => state.id === newSelectedState.id)
    ) {
      throw new ValidationException(
        `Selected state '${newSelectedState.displayName}' is not part of the current flow states: ${innovationFlow.states.map(
          state => state.displayName
        )}`,
        LogContext.INNOVATION_FLOW
      );
    }

    innovationFlow.currentState = newSelectedState;

    return await this.save(innovationFlow);
  }

  async deleteInnovationFlow(
    innovationFlowID: string
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: {
          profile: true,
          states: true,
        },
      }
    );
    if (!innovationFlow.states || !innovationFlow.profile) {
      throw new RelationshipNotFoundException(
        `Unable to find states or profile on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }

    await this.profileService.deleteProfile(innovationFlow.profile.id);
    for (const state of innovationFlow.states) {
      await this.innovationFlowStateService.delete(state);
    }

    const result = await this.innovationFlowRepository.remove(
      innovationFlow as InnovationFlow
    );
    result.id = innovationFlowID;
    return result;
  }

  async getInnovationFlowOrFail(
    innovationFlowID: string,
    options?: FindOneOptions<InnovationFlow>
  ): Promise<IInnovationFlow | never> {
    const innovationFlow = await this.innovationFlowRepository.findOne({
      where: { id: innovationFlowID },
      ...options,
    });

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlow with ID: ${innovationFlowID}`,
        LogContext.INNOVATION_FLOW
      );
    return innovationFlow;
  }

  public async getProfile(
    innovationFlowInput: IInnovationFlow,
    relations?: FindOptionsRelations<IInnovationFlow>
  ): Promise<IProfile> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: { profile: true, ...relations },
      }
    );
    if (!innovationFlow.profile)
      throw new EntityNotFoundException(
        `InnovationFlow profile not initialised: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );

    return innovationFlow.profile;
  }

  public async getStates(
    innovationFlowID: string
  ): Promise<IInnovationFlowState[]> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: { states: true },
      }
    );
    if (!innovationFlow.states) {
      throw new EntityNotFoundException(
        `InnovationFlow States not initialised: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }

    // sort the states by sortOrder
    return innovationFlow.states.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public async getFlowTagsetTemplate(
    innovationFlowInput: IInnovationFlow,
    relations?: FindOptionsRelations<IInnovationFlow>
  ): Promise<ITagsetTemplate> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: { flowStatesTagsetTemplate: true, ...relations },
      }
    );
    if (!innovationFlow.flowStatesTagsetTemplate)
      throw new EntityNotFoundException(
        `InnovationFlow profile not initialised: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );

    return innovationFlow.flowStatesTagsetTemplate;
  }

  public async updateStatesSortOrder(
    innovationFlowID: string,
    sortOrderData: UpdateInnovationFlowStatesSortOrderInput
  ): Promise<IInnovationFlowState[]> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: { states: true },
      }
    );
    if (!innovationFlow.states) {
      throw new EntityNotFoundException(
        `InnovationFlow not initialised, no states: ${innovationFlowID}`,
        LogContext.COLLABORATION
      );
    }

    const allStates = innovationFlow.states;

    const statesByID = {
      ...keyBy(allStates, 'nameID'),
      ...keyBy(allStates, 'id'),
    };

    const sortOrders = [
      ...sortOrderData.stateIDs
        .map(stateID => statesByID[stateID]?.sortOrder)
        .filter(sortOrder => sortOrder !== undefined),
    ];

    const minimumSortOrder =
      sortOrders.length > 0 ? Math.min(...sortOrders) : 0;
    const modifiedStates: IInnovationFlowState[] = [];

    // Get the callouts specified
    const statesInOrder: IInnovationFlowState[] = [];
    let index = 1;
    for (const stateID of sortOrderData.stateIDs) {
      const state = statesByID[stateID];
      if (!state) {
        throw new EntityNotFoundException(
          `State with requested ID (${stateID}) not located within current InnovationFlow: ${innovationFlowID}`,
          LogContext.INNOVATION_FLOW
        );
      }
      statesInOrder.push(state);
      const newSortOrder = minimumSortOrder + index;
      if (state.sortOrder !== newSortOrder) {
        state.sortOrder = newSortOrder;
        modifiedStates.push(state);
      }
      index++;
    }

    await Promise.all(
      modifiedStates.map(
        async state => await this.innovationFlowStateService.save(state)
      )
    );

    return statesInOrder;
  }
}
