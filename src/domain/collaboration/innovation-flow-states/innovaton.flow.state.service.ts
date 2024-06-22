import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';

@Injectable()
export class InnovationFlowStatesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getStates(statesStr: string): IInnovationFlowState[] {
    const states: IInnovationFlowState[] = this.deserializeStates(statesStr);
    return states;
  }

  public getStateNames(statesStr: string): string[] {
    const states = this.getStates(statesStr);
    return states.map(state => state.displayName);
  }

  public serializeStates(states: IInnovationFlowState[]): string {
    return JSON.stringify(states);
  }

  private deserializeStates(statesStr: string): IInnovationFlowState[] {
    return JSON.parse(statesStr);
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
    states: CreateInnovationFlowStateInput[] | UpdateInnovationFlowStateInput[]
  ) {
    if (states.length === 0) {
      throw new ValidationException(
        `At least one state must be defined: ${states}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const stateNames = states.map(state => state.displayName);
    const uniqueStateNames = new Set(stateNames);
    if (uniqueStateNames.size !== stateNames.length) {
      throw new ValidationException(
        `State names must be unique: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
  }
}
