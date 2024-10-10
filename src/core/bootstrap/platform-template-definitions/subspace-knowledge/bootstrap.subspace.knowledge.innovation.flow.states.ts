import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

export enum FlowState {
  GOING_LIVE = 'Going Live',
  INTRODUCTION = 'Introduction',
  BODY_OF_KNOWLEDGE = 'Body of Knowledge',
  KNOWLEDGE_UPDATES = 'Knowledge Updates',
}

export const bootstrapSubspaceKnowledgeInnovationFlowStates: IInnovationFlowState[] =
  [
    {
      displayName: FlowState.INTRODUCTION,
      description:
        'Scroll down to read more about how to get started. Ready to add some knowledge to your Virtual Contributor? Click on Body of Knowledge ⬆️',
    },
    {
      displayName: FlowState.BODY_OF_KNOWLEDGE,
      description:
        'Here you can share all relevant information for the Virtual Contributor to know about. To get started, three posts have already been added. Click on the ➕ Collaboration Tool to add more.',
    },
    {
      displayName: FlowState.KNOWLEDGE_UPDATES,
      description: '',
    },
  ];
