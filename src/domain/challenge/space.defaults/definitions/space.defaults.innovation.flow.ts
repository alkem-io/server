import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export const innovationFlowStatesDefault: IInnovationFlowState[] = [
  {
    displayName: 'Explore',
    description:
      '🔍 A journey of discovery! Gather insights through research and observation.',
  },
  {
    displayName: 'Define',
    description:
      '🎯 Sharpen your focus. Define the challenge with precision and set a clear direction.',
  },
  {
    displayName: 'Brainstorm',
    description:
      '🎨 Ignite creativity. Generate a constellation of ideas, using concepts from diverse perspectives to get inspired.',
  },
  {
    displayName: 'Validate',
    description:
      '🛠️ Test assumptions. Build prototypes, seek feedback, and validate your concepts. Adapt based on real-world insights.',
  },
  {
    displayName: 'Evaluate',
    description:
      '✅ Assess impact, feasibility, and alignment to make informed choices.',
  },
];
