import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export enum FlowState {
  PHASE_1 = 'Phase 1',
  PHASE_2 = 'Phase 2',
  PHASE_3 = 'Phase 3',
}

export const spaceDefaultsInnovationFlowStatesBlankSlate: IInnovationFlowState[] =
  [
    {
      displayName: FlowState.PHASE_1,
      description:
        '🔍 A journey of discovery! Gather insights through research and observation.',
    },
    {
      displayName: FlowState.PHASE_2,
      description: '🔍 The next phase....',
    },
    {
      displayName: FlowState.PHASE_3,
      description: '🔍 And another phase!',
    },
  ];
