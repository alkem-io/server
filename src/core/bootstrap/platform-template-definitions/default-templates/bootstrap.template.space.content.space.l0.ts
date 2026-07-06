import { ActorType } from '@common/enums/actor.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';

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
          maximumNumberOfStates: 8,
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
          // Contributor-collection callout in the Community tab, replacing the
          // removed hard-coded community contributor widget
          // (workspace#008-contributor-collection-callout, FR-023/FR-024).
          // Spaces created from this default template inherit it via the
          // normal template clone path. Existing environments get the same
          // callout backfilled by the
          // FixTemplateFlagsSeedPlatformSpaceContributors migration; this
          // definition covers fresh installs, where bootstrap runs after
          // migrations and creates this template from scratch.
          {
            nameID: 'contributors',
            sortOrder: 1,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.COMMUNITY],
                },
              ],
            },
            framing: {
              type: CalloutFramingType.CONTRIBUTORS,
              profile: {
                displayName: 'Contributors',
              },
            },
            settings: {
              framing: {
                contributors: {
                  contributorTypes: [
                    ActorType.USER,
                    ActorType.ORGANIZATION,
                    ActorType.VIRTUAL_CONTRIBUTOR,
                  ],
                  defaultContributorType: ActorType.USER,
                  defaultView: ContributorCollectionView.LIST,
                },
              },
            },
          },
          // Spaces-collection callout on the Subspaces tab, replacing the
          // removed hard-coded subspaces block
          // (workspace#013-spaces-collection-callout, US3/FR-013). It is
          // CONFIG-FREE (no settings block) — contrast the CONTRIBUTORS callout
          // above — and its framing profile displayName is deliberately
          // "Subspaces" (preserve the block name, FR-004g). `sortOrder: 1`
          // renders it first on the Subspaces tab. Spaces created from this
          // default template inherit it via the normal template clone path;
          // existing environments get the same callout backfilled by the
          // BackfillSpacesCalloutL0Subspaces migration.
          {
            nameID: 'subspaces',
            sortOrder: 1,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.SUBSPACES],
                },
              ],
            },
            framing: {
              type: CalloutFramingType.SPACES,
              profile: {
                displayName: 'Subspaces',
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
        allowGuestContributions: false,
      },
    },
    about: {
      profileData: {
        displayName: 'Home Space',
        tagline: 'A home to go from here to there, together!',
      },
    },
  };
