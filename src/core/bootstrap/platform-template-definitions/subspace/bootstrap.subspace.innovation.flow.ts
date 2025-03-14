import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';

export enum FlowState {
  EXPLORE = 'Explore',
  DEFINE = 'Define',
  BRAINSTORM = 'Brainstorm',
  VALIDATE = 'Validate',
  EVALUATE = 'Evaluate',
}

export const bootstrapSubspaceInnovationFlow: CreateInnovationFlowInput = {
  profile: {
    displayName: 'Subspace Innovation Flow',
  },
  settings: {
    maximumNumberOfStates: 8,
    minimumNumberOfStates: 1,
  },
  states: [
    {
      displayName: FlowState.EXPLORE,
      description:
        '🔍 A journey of discovery! Gather insights through research and observation.',
    },
    {
      displayName: FlowState.DEFINE,
      description:
        '🎯 Sharpen your focus. Define the challenge with precision and set a clear direction.',
    },
    {
      displayName: FlowState.BRAINSTORM,
      description:
        '🎨 Ignite creativity. Generate a constellation of ideas, using concepts from diverse perspectives to get inspired.',
    },
    {
      displayName: FlowState.VALIDATE,
      description:
        '🛠️ Test assumptions. Build prototypes, seek feedback, and validate your concepts. Adapt based on real-world insights.',
    },
    {
      displayName: FlowState.EVALUATE,
      description:
        '✅ Assess impact, feasibility, and alignment to make informed choices.',
    },
  ],
};
