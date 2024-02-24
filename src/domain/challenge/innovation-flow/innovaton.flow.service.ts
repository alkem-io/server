import { UUID_LENGTH } from '@common/constants';
import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { UpdateProfileSelectTagsetDefinitionInput } from '@domain/common/profile/dto/profile.dto.update.select.tagset.definition';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IInnovationFlowState } from './innovation.flow.dto.state.interface';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.update.selected.state';
import { UpdateProfileSelectTagsetValueInput } from '@domain/common/profile/dto/profile.dto.update.select.tagset.value';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput,
    tagsetTemplates: ITagsetTemplate[],
    storageAggregator: IStorageAggregator
  ): Promise<IInnovationFlow> {
    if (innovationFlowData.innovationFlowTemplateID) {
      await this.innovationFlowTemplateService.validateInnovationFlowDefinitionOrFail(
        innovationFlowData.innovationFlowTemplateID,
        innovationFlowData.spaceID,
        innovationFlowData.type
      );
    } else {
      innovationFlowData.innovationFlowTemplateID =
        await this.innovationFlowTemplateService.getDefaultInnovationFlowTemplateId(
          innovationFlowData.spaceID,
          innovationFlowData.type
        );
    }
    const innovationFlow: IInnovationFlow = new InnovationFlow();
    innovationFlow.authorization = new AuthorizationPolicy();
    innovationFlow.spaceID = innovationFlowData.spaceID;

    const tagsetInputs =
      this.profileService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );

    innovationFlowData.profile.tagsets =
      this.profileService.updateProfileTagsetInputs(
        innovationFlowData.profile.tagsets,
        tagsetInputs
      );
    innovationFlow.profile = await this.profileService.createProfile(
      innovationFlowData.profile,
      ProfileType.INNOVATION_FLOW,
      storageAggregator
    );

    await this.profileService.addVisualOnProfile(
      innovationFlow.profile,
      VisualType.CARD
    );

    const defaultStates: CreateInnovationFlowStateInput[] = [
      {
        displayName: 'prepare',
        explanation: 'The innovation is being prepared.',
        sortOrder: 1,
      },
      {
        displayName: 'in progress',
        explanation: 'The innovation is in progress.',
        sortOrder: 2,
      },
      {
        displayName: 'summary',
        explanation: 'The summary of the flow results.',
        sortOrder: 3,
      },
      {
        displayName: 'done',
        explanation: 'The flow is completed.',
        sortOrder: 4,
      },
    ];
    innovationFlow.states = this.serializeStates(defaultStates);

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async update(
    innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );

    if (innovationFlowData.states) {
      const newStateNames = innovationFlowData.states.map(
        state => state.displayName
      );

      const updateData: UpdateProfileSelectTagsetDefinitionInput = {
        profileID: innovationFlow.profile.id,
        allowedValues: newStateNames,
        defaultSelectedValue: newStateNames[0], // default to first in the list
        tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
      };
      await this.profileService.updateSelectTagsetDefinition(updateData);

      // serialize the states
      innovationFlow.states = this.serializeStates(innovationFlowData.states);
    }

    if (innovationFlowData.profileData) {
      innovationFlow.profile = await this.profileService.updateProfile(
        innovationFlow.profile,
        innovationFlowData.profileData
      );
    }

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async updateSelectedState(
    innovationFlowSelectedStateData: UpdateInnovationFlowSelectedStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );

    const statesTagset = await this.profileService.getTagset(
      innovationFlow.profile.id,
      TagsetReservedName.FLOW_STATE.valueOf()
    );

    const newStateName = innovationFlowSelectedStateData.selectedState;
    const newStateAllowed = statesTagset.tags.includes(newStateName);
    if (!newStateAllowed) {
      throw new ValidationException(
        `New state '${newStateName}' not in allowed states: ${statesTagset.tags}`,
        LogContext.CHALLENGES
      );
    }

    const updateData: UpdateProfileSelectTagsetValueInput = {
      profileID: innovationFlow.profile.id,
      selectedValue: newStateName,
      tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
    };
    await this.profileService.updateSelectTagsetValue(updateData);
    return await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );
  }

  async deleteInnovationFlow(
    innovationFlowID: string
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: { profile: true },
      }
    );

    if (innovationFlow.profile) {
      await this.profileService.deleteProfile(innovationFlow.profile.id);
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
    let innovationFlow: IInnovationFlow | null = null;
    if (innovationFlowID.length === UUID_LENGTH) {
      innovationFlow = await this.innovationFlowRepository.findOne({
        where: { id: innovationFlowID },
        ...options,
      });
    }

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlow with ID: ${innovationFlowID}`,
        LogContext.CHALLENGES
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
        LogContext.COLLABORATION
      );

    return innovationFlow.profile;
  }

  public getStates(flow: IInnovationFlow): IInnovationFlowState[] {
    const states: IInnovationFlowState[] = this.deserializeStates(flow.states);
    return states.sort((a, b) => (a.sortOrder > b.sortOrder ? 1 : -1));
  }

  public getStateNames(flow: IInnovationFlow): string[] {
    const states = this.getStates(flow);
    return states.map(state => state.displayName);
  }

  private deserializeStates(statesStr: string): IInnovationFlowState[] {
    return JSON.parse(statesStr);
  }

  private serializeStates(states: IInnovationFlowState[]): string {
    return JSON.stringify(states);
  }
}
