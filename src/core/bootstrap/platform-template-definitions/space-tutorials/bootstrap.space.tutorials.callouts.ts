/* eslint-disable prettier/prettier */
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { FlowState } from './bootstrap.space.tutorials.innovation.flow.states';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { CalloutVisibility } from '@common/enums/callout.visibility';

export const bootstrapSpaceTutorialsCallouts: CreateCalloutInput[] = [
  {
    nameID: 'welcome',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.HOME,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '👋 Welcome to your space!',
        description:
          "Take an interactive tour below to discover how our spaces are designed. We also invite you to explore the other tutorials available on this page and beyond. We're excited to have you here! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/zVYe3x4PkZjUkMEMP9Kg?embed&show_copy_link=true' title='👋 Welcome to your space' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
  {
    nameID: 'space-setup',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 2,
    groupName: CalloutGroupName.HOME,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '⚙️ Set it up your way!',
        description:
          "In this concise guide, you'll discover how to customize your Space to suit your needs. Learn more about how to set the visibility of the Space, how people can join, and what essential information to include on the about page. Let's get started! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/Rbwhpk4zro3Uer61iQKL?embed&show_copy_link=true' title='⚙️ Set it up your way!' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
  {
    nameID: 'collaboration-tools',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 3,
    groupName: CalloutGroupName.HOME,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '🧩 Collaboration tools',
        description:
          "Collaboration tools allow you to gather existing knowledge from your community and (co-)create new insights through text and visuals. In the tour below you will learn all about the different tools and how to use them. Enjoy! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/ItWjHrsXuFfVr0E7Epbo?embed&show_copy_link=true' title='Collaboration Tools' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
  {
    nameID: 'cleaning-up',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 4,
    groupName: CalloutGroupName.HOME,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '🧹 Cleaning up',
        description:
          "Done with the tutorials and ready to build up this Space your way? You can move the tutorials to your knowledge base or delete them completely.\n\n*   To move:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Edit\n    *   Scroll down to 'Location'\n    *   Select 'Knowledge Base' or any other page\n\n*   To remove:\n\n    *   Click on the ⚙️ icon on the block with the tutorial > Delete\n    *   Confirm",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
  {
    nameID: 'community-setup',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.COMMUNITY,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '🤝 Set up your Community',
        description:
          "In this tour, you'll discover how to define permissions, create guidelines, set up an application process, and send out invitations. Let's get started! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/guBQToL8DWsnjCE7GLve?embed&show_copy_link=true'title='🏘️ Set up your Community' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
  {
    nameID: 'about-subspaces',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.SUBSPACES,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '↪️ Subspaces',
        description:
          "Below, we'll explore the concept of Subspaces. You will learn more about what to use these Subspaces for, what functionality is available, and how you can guide the process using an Innovation Flow. \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/gekGPsfEADYWHGaB0QKW?embed&show_copy_link=true' title='Subspaces' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
  {
    nameID: 'about-knowledge-base',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.KNOWLEDGE,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName: '📚 The Knowledge Base',
        description:
          "Welcome to your knowledge base! This page serves as a central repository for valuable information and references that are relevant for the entire community.\n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/pSXpCpds3Mcdibk8LhBE?embed&show_copy_link=true' title='Knowledge Base' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.HOME],
          },
        ],
      },
    },
  },
];
