import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';

export enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

export const bootstrapSpaceTutorialsInnovationFlow: CreateInnovationFlowInput =
  {
    profile: {
      displayName: 'Space Tutorials Innovation Flow',
    },
    settings: {
      maximumNumberOfStates: 8,
      minimumNumberOfStates: 1,
    },
    states: [
      {
        displayName: FlowState.HOME,
        description:
          '🔍 A journey of discovery! Gather insights through research and observation.',
      },
    ],
  };
