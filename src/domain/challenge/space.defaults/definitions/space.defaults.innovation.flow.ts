import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export const innovationFlowStatesDefault: IInnovationFlowState[] = [
  {
    displayName: 'prepare',
    description: 'The innovation is being prepared.',
  },
  {
    displayName: 'in progress',
    description: 'The innovation is in progress.',
  },
  {
    displayName: 'summary',
    description: 'The summary of the flow results.',
  },
  {
    displayName: 'done',
    description: 'The flow is completed.',
  },
];
