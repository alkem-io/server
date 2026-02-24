import { ActorType } from '@common/enums/actor.type';
import { VirtualContributorBodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';
import { VirtualContributorDataAccessMode } from '@common/enums/virtual.contributor.data.access.mode';
import { VirtualContributorInteractionMode } from '@common/enums/virtual.contributor.interaction.mode';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';

export const virtualContributorData: {
  virtualContributor: IVirtualContributor;
} = {
  virtualContributor: {
    type: ActorType.VIRTUAL_CONTRIBUTOR,
    rowId: 1,
    id: '08a43f9f-58e7-4c65-bf38-be283a548b3b',
    nameID: 'bridgeuniandbusiness',
    bodyOfKnowledgeType: VirtualContributorBodyOfKnowledgeType.ALKEMIO_SPACE,
    aiPersonaID: 'ai-persona-08a43f9f-58e7-4c65-bf38-be283a548b3b',
    bodyOfKnowledgeID: 'body-of-knowledge-08a43f9f-58e7-4c65-bf38-be283a548b3b',
    dataAccessMode: VirtualContributorDataAccessMode.SPACE_PROFILE,
    interactionModes: [VirtualContributorInteractionMode.DISCUSSION_TAGGING],
    platformSettings: {
      promptGraphEditingEnabled: true,
    },
    // Add other required IVirtualContributor fields as needed for type safety
    // e.g., aiPersona, knowledgeBase, searchVisibility, listedInStore, settings, etc.,
    knowledgeBase: undefined as any, // Replace with a valid mock if required by tests
    searchVisibility: undefined as any, // Replace with a valid SearchVisibility if required
    listedInStore: false, // Default value, update as needed
    settings: undefined as any, // Replace with a valid mock if required by tests
    profile: {
      id: 'profile-08a43f9f-58e7-4c65-bf38-be283a548b3b',
      tagline: '',
      description: '',
      displayName: 'Bridge Uni and Business',
      type: undefined as any, // Set ProfileType if required
      authorization: undefined as any, // Set a valid mock if required
      createdDate: new Date('2024-01-01T00:00:00.000Z'),
      updatedDate: new Date('2024-01-01T00:00:00.000Z'),
    },
    createdDate: new Date('2024-01-01T00:00:00.000Z'),
    updatedDate: new Date('2024-01-01T00:00:00.000Z'),
  },
};
