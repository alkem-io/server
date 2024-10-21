import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

export const bootstrapSpaceTutorialsInnovationFlowStates: IInnovationFlowState[] =
  [
    {
      displayName: FlowState.HOME,
      description:
        '🔍 A journey of discovery! Gather insights through research and observation.',
    },
  ];
