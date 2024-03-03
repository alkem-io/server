import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IInnovationFlowState } from './innovation.flow.state.interface';

@Injectable()
export class InnovationFlowStatesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public getStates(statesStr: string): IInnovationFlowState[] {
    const states: IInnovationFlowState[] = this.deserializeStates(statesStr);
    return states.sort((a, b) => (a.sortOrder > b.sortOrder ? 1 : -1));
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
}
