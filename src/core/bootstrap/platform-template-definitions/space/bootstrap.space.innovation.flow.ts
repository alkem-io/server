import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

export const bootstrapSpaceInnovationFlowStates: IInnovationFlowState[] = [
  {
    displayName: FlowState.HOME,
    description:
      '🔍 A journey of discovery! Gather insights through research and observation.',
  },
  {
    displayName: FlowState.COMMUNITY,
    description: '🔍 The next phase....',
  },
  {
    displayName: FlowState.SUBSPACES,
    description: '🔍 And another phase!',
  },
  {
    displayName: FlowState.KNOWLEDGE,
    description: '🔍 And another phase!',
  },
];
