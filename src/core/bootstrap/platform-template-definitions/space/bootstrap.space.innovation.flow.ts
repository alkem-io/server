import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';

export enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

export const bootstrapSpaceInnovationFlow: CreateInnovationFlowInput = {
  profile: {
    displayName: 'Space Innovation Flow',
  },
  settings: {
    maximumNumberOfStates: 5,
    minimumNumberOfStates: 4,
  },
  states: [
    {
      displayName: FlowState.HOME,
      description:
        '🔍 A journey of discovery! Gather insights through research and observation.',
    },
    {
      displayName: FlowState.COMMUNITY,
      description: '🔍 The contributors to this Space!',
    },
    {
      displayName: FlowState.SUBSPACES,
      description:
        '🔍 Here you can explore the hosted Subspaces. Filter by key words to show just the topics you care about.',
    },
    {
      displayName: FlowState.KNOWLEDGE,
      description:
        '🔍 In the Knowledge Base you will find relevant documents, insights and other materials about the topic. The leads of the Space can provide the content, but also community members can contribute.',
    },
  ],
};
