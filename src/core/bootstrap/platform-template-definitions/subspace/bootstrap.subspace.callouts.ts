import { CalloutGroupName } from '@common/enums/callout.group.name';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { FlowState } from './bootstrap.subspace.innovation.flow.states';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { CalloutVisibility } from '@common/enums/callout.visibility';

export const bootstrapSubspaceCallouts: CreateCalloutInput[] = [
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
        displayName: '👋 Welcome to your subpace!',
        description:
          // eslint-disable-next-line quotes
          "Take an interactive tour below to discover how our subpaces are designed. We're excited to have you here! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/X6hQiRnkEmUSoOgRupvA?embed&show_copy_link=true'title='Welcome to your Subspace ' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.EXPLORE],
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
    sortOrder: 2,
    groupName: CalloutGroupName.HOME,
    visibility: CalloutVisibility.PUBLISHED,
    framing: {
      profile: {
        displayName:
          '🪇 Write, draw, or link anything with the Collaboration Tools',
        description:
          // eslint-disable-next-line quotes
          "Collaboration tools allow you to gather existing knowledge from your community and (co-)create new insights through text and visuals. In the tour below you will learn all about the different tools and how to use them. Enjoy! \n<div style='position: relative; padding-bottom: calc(40% + 41px); height: 0; width: 100%;'><iframe src='https://demo.arcade.software/5fvizP4ekEOya5CGHIwa?embed&show_copy_link=true'title='Subpace Collaboration Tools' frameborder='0' loading='lazy' webkitallowfullscreen mozallowfullscreen allowfullscreen allow='clipboard-write' style='position: absolute; top: 0; left: 0; width: 100%; height: 100%;color-scheme: light;'></iframe></div>\n",
        tagsets: [
          {
            name: TagsetReservedName.FLOW_STATE,
            tags: [FlowState.EXPLORE],
          },
        ],
      },
    },
  },
];
