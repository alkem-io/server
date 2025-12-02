import { CreateTemplateContentSpaceInput } from '@domain/template/template-content-space/dto/template.content.space.dto.create';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';

export enum FlowState {
  EXPLORE = 'Explore',
  DEFINE = 'Define',
  BRAINSTORM = 'Brainstorm',
  VALIDATE = 'Validate',
  EVALUATE = 'Evaluate',
}

export const bootstrapTemplateSpaceContentSubspace: CreateTemplateContentSpaceInput =
  {
    level: 1,
    subspaces: [],
    collaborationData: {
      innovationFlowData: {
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
                  tags: [FlowState.EXPLORE],
                },
              ],
            },
            framing: {
              profile: {
                displayName: '👋 Welcome to your subspace!',
                description:
                  "Take an interactive tour below to discover how our subspaces are designed. We're excited to have you here! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/X6hQiRnkEmUSoOgRupvA?embed&show_copy_link=true'title='Welcome to your Subspace ' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
              },
            },
          },
          {
            nameID: 'collaboration-tools',
            sortOrder: 2,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.EXPLORE],
                },
              ],
            },
            framing: {
              profile: {
                displayName:
                  '🪇 Write, draw, or link anything with the Collaboration Tools',
                description:
                  "Collaboration tools allow you to gather existing knowledge from your community and (co-)create new insights through text and visuals. In the tour below you will learn all about the different tools and how to use them. Enjoy! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/5fvizP4ekEOya5CGHIwa?embed&show_copy_link=true'title='Subpace Collaboration Tools' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
              },
            },
          },
        ],
      },
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.PUBLIC,
        allowPlatformSupportAsAdmin: false,
      },
      membership: {
        policy: CommunityMembershipPolicy.OPEN,
        trustedOrganizations: [], // only allow to be host org for now, not on subspaces
        allowSubspaceAdminsToInviteMembers: false,
      },
      collaboration: {
        inheritMembershipRights: true,
        allowMembersToCreateSubspaces: true,
        allowMembersToCreateCallouts: true,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: false,
        allowGuestContributions: false,
      },
    },
    about: {
      profileData: {
        displayName: 'A working subspace',
        tagline: 'Work together in this subspace!',
      },
    },
  };
