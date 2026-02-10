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

export const bootstrapTemplateSpaceContentCalloutsSpaceL0Tutorials: CreateTemplateContentSpaceInput =
  {
    level: 0,
    subspaces: [],
    collaborationData: {
      innovationFlowData: {
        profile: {
          displayName: 'Space Tutorials Innovation Flow',
        },
        settings: {
          maximumNumberOfStates: 8,
          minimumNumberOfStates: 1,
        },
        states: [
          {
            displayName: FlowState.HOME,
            description:
              '🔍 A journey of discovery! Gather insights through research and observation.',
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
                description:
                  "Take an interactive tour below to discover how our spaces are designed. We also invite you to explore the other tutorials available on this page and beyond. We're excited to have you here! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/zVYe3x4PkZjUkMEMP9Kg?embed&show_copy_link=true' title='👋 Welcome to your space' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
              },
            },
          },
          {
            nameID: 'space-setup',
            sortOrder: 2,
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
                displayName: '⚙️ Set it up your way!',
                description:
                  "In this concise guide, you'll discover how to customize your Space to suit your needs. Learn more about how to set the visibility of the Space, how people can join, and what essential information to include on the about page. Let's get started! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/Rbwhpk4zro3Uer61iQKL?embed&show_copy_link=true' title='⚙️ Set it up your way!' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
              },
            },
          },
          {
            nameID: 'collaboration-tools',
            sortOrder: 3,
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
                displayName: '🧩 Collaboration tools',
                description:
                  "Collaboration tools allow you to gather existing knowledge from your community and (co-)create new insights through text and visuals. In the tour below you will learn all about the different tools and how to use them. Enjoy! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/ItWjHrsXuFfVr0E7Epbo?embed&show_copy_link=true' title='Collaboration Tools' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
              },
            },
          },
          {
            nameID: 'cleaning-up',
            sortOrder: 4,
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
                displayName: '🧹 Cleaning up',
                description:
                  'Done with the tutorials and ready to build up this Space/Subspace your way? You can move the tutorials or delete them completely. \n\n*   To move in a Space:\n\n    *   Go to the settings using the ⚙️ icon on the top right of the space \n    *   Go to the LAYOUT tab \n    *   Drag the tool to the page you want\n\n* To move in a Subspace:\n\n    *   Go to the innovation flow and click on the icon to manage the flow \n    *   Drag the tool to the phase you want\n\n*   To remove:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Delete\n    *   Confirm \n\n You can always find the tutorials in the [tutorials template pack](https://alkem.io/innovation-packs/newspace) and in the [documentation](https://alkem.io/docs/how-to/tutorials.en-US).',
              },
            },
          },
          {
            nameID: 'community-setup',
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
              profile: {
                displayName: '🤝 Set up your Community',
                description:
                  "In this tour, you'll discover how to define permissions, create guidelines, set up an application process, and send out invitations. Let's get started! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/guBQToL8DWsnjCE7GLve?embed&show_copy_link=true'title='🏘️ Set up your Community' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>",
              },
            },
          },
          {
            nameID: 'about-subspaces',
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
              profile: {
                displayName: '↪️ Subspaces',
                description:
                  "Below, we'll explore the concept of Subspaces. You will learn more about what to use these Subspaces for, what functionality is available, and how you can guide the process using an Innovation Flow. \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/gekGPsfEADYWHGaB0QKW?embed&show_copy_link=true' title='Subspaces' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
              },
            },
          },
          {
            nameID: 'about-knowledge-base',
            sortOrder: 1,
            classification: {
              tagsets: [
                {
                  name: TagsetReservedName.FLOW_STATE,
                  tags: [FlowState.KNOWLEDGE],
                },
              ],
            },
            framing: {
              profile: {
                displayName: '📚 The Knowledge Base',
                description:
                  "Welcome to your knowledge base! This page serves as a central repository for valuable information and references that are relevant for the entire community.\n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/pSXpCpds3Mcdibk8LhBE?embed&show_copy_link=true' title='Knowledge Base' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
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
        displayName: 'Space Template to provide tutorials',
        tagline: 'Getting started tutorials!',
      },
    },
  };
