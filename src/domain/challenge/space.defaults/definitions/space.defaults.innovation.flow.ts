import { IInnovationFlowState } from '@domain/challenge/innovation-flow-states/innovation.flow.state.interface';

export const innovationFlowStatesDefault: IInnovationFlowState[] = [
  {
    displayName: 'prepare',
    description: 'The innovation is being prepared.',
    sortOrder: 1,
  },
  {
    displayName: 'in progress',
    description: 'The innovation is in progress.',
    sortOrder: 2,
  },
  {
    displayName: 'summary',
    description: 'The summary of the flow results.',
    sortOrder: 3,
  },
  {
    displayName: 'done',
    description: 'The flow is completed.',
    sortOrder: 4,
  },
];
