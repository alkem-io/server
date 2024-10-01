/* eslint-disable prettier/prettier */
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { FlowState } from './bootstrap.space.innovation.flow';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';

export const bootstrapSpaceCallouts: CreateCalloutInput[] = [
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
        description: 'An empty space for you to configure!.',
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
