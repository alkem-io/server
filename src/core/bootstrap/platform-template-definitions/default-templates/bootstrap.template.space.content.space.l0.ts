import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';

export enum FlowState {
  HOME = 'Home',
  COMMUNITY = 'Community',
  SUBSPACES = 'Subspaces',
  KNOWLEDGE = 'Knowledge',
}

export const bootstrapTemplateSpaceContentSpaceL0: CreateTemplateContentSpaceInput =
  {
    level: 0,
    subspaces: [],
    collaborationData: {
      innovationFlowData: {
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
      },
      calloutsSetData: {
        calloutsData: [
          {
            nameID: 'welcome',
            sortOrder: 1,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.HOME],
                },
              ],
            },
            framing: {
              profile: {
                displayName: '👋 Welcome to your space!',
                description: 'An empty space for you to configure!.',
              },
            },
          },
        ],
      },
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.PRIVATE,
        allowPlatformSupportAsAdmin: false,
      },
      membership: {
        policy: CommunityMembershipPolicy.APPLICATIONS,
        trustedOrganizations: [], // only allow to be host org for now, not on subspaces
        allowSubspaceAdminsToInviteMembers: true,
      },
      collaboration: {
        inheritMembershipRights: false,
        allowMembersToCreateSubspaces: false,
        allowMembersToCreateCallouts: false,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: false,
      },
    },
    about: {
      profileData: {
        displayName: 'Home Space',
        tagline: 'A home to go from here to there, together!',
      },
    },
  };
