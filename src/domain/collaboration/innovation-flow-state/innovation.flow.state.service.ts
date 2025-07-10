import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';

@Injectable()
export class InnovationFlowStateService {
  constructor(
    @InjectRepository(InnovationFlowState)
    private innovationFlowRepository: Repository<InnovationFlowState>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    stateData: CreateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const innovationFlowState: IInnovationFlowState =
      InnovationFlowState.create();
    innovationFlowState.displayName = stateData.displayName;
    innovationFlowState.description = stateData.description || '';
    innovationFlowState.settings = {
      someFlag: true,
    };
    innovationFlowState.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_FLOW_STATE
    );

    return innovationFlowState;
  }

  async save(
    innovationFlowState: IInnovationFlowState
  ): Promise<IInnovationFlowState> {
    return await this.innovationFlowRepository.save(innovationFlowState);
  }

  async getInnovationFlowStateOrFail(
    innovationFlowID: string,
    options?: FindOneOptions<InnovationFlowState>
  ): Promise<IInnovationFlowState | never> {
    const innovationFlow = await this.innovationFlowRepository.findOne({
      where: { id: innovationFlowID },
      ...options,
    });

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlowState with ID: ${innovationFlowID}`,
        LogContext.INNOVATION_FLOW
      );
    return innovationFlow;
  }

  public getStateNames(states: IInnovationFlowState[]): string[] {
    return states.map(state => state.displayName);
  }

  public convertInputsToStates(
    statesInput:
      | CreateInnovationFlowStateInput[]
      | UpdateInnovationFlowStateInput[]
  ): IInnovationFlowState[] {
    const result: IInnovationFlowState[] = [];
    for (const stateInput of statesInput) {
      const state: IInnovationFlowState = {
        displayName: stateInput.displayName,
        description: stateInput.description || '',
      };
      result.push(state);
    }
    return result;
  }

  public validateDefinition(
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
}
