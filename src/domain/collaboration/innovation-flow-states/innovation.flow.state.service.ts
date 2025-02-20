import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';

@Injectable()
export class InnovationFlowStatesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

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
          `Innovation Flow must have a minimum of ${settings.maximumNumberOfStates} states; provided: ${states}`,
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
