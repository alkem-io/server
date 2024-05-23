import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { EMPTY_WHITEBOARD_CONTENT } from '@domain/common/whiteboard/empty.whiteboard.content';

export const spaceDefaultCallouts: CreateCalloutInput[] = [
  {
    nameID: 'welcome',
    type: CalloutType.POST,
    contributionPolicy: {
      state: CalloutState.OPEN,
    },
    sortOrder: 1,
    groupName: CalloutGroupName.HOME,
    framing: {
      profile: {
        displayName: '👋 Welcome to your space!',
        description: 'Take an interactive tour below to discover how our spaces are thoughtfully designed. Alternatively, explore the other tutorials available on this page and beyond. We\'re excited to have you here! \n<div style=\'position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;\'><iframe src=\'https://demo.arcade.software/zVYe3x4PkZjUkMEMP9Kg?embed&show_copy_link=true\' title=\'👋 Welcome to your space\' frameborder=\'0\' loading=\'lazy\' webkitallowfullscreen mozallowfullscreen allowfullscreen allow=\'clipboard-write\' style=\'position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;\'></iframe></div>\n',
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
    framing: {
      profile: {
        displayName: '⚙️ Set it up your way!',
        description: 'In this concise guide, you will discover how to customize your Space to suit your needs. Learn whether your Space should be visible to everyone or just its members, how people can join (directly or by applying), and what essential information to include on the about page. \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/Rbwhpk4zro3Uer61iQKL?embed&show_copy_link=true' title='⚙️ Set it up your way!' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n',
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
    framing: {
      profile: {
        displayName: '🤝 Set up your Community',
        description: 'In this tour, you will discover how to configure your community, define permissions, create guidelines, set up an application process, and send out invitations. Enjoy! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/guBQToL8DWsnjCE7GLve?embed&show_copy_link=true'title='🏘️ Set up your Community' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>',
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
    framing: {
      profile: {
        displayName: '↪️ Subspaces',
        description: 'Below, we will explore the concept of Subspaces. You will learn more about what to use these Subspaces for, what functionality is available, and how you can guide the process using an Innovation Flow. \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/gekGPsfEADYWHGaB0QKW?embed&show_copy_link=true' title='Subspaces' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n',
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
    framing: {
      profile: {
        displayName: '📚 The Knowledge Base',
        description: 'Welcome to your knowledge base! This page serves as a central repository for valuable information and references. In the tour below, you will discover how to maximize the utility of this resource. \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/pSXpCpds3Mcdibk8LhBE?embed&show_copy_link=true' title='Knowledge Base' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n',
      },
    },
  },
];
