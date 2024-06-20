import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export enum FlowState {
  NOT_USED = 'Not used',
}

export const spaceDefaultsInnovationFlowStatesRootSpace: IInnovationFlowState[] =
  [
    {
      displayName: FlowState.NOT_USED,
      description:
        '🔍 A journey of discovery! Gather insights through research and observation.',
    },
  ];
