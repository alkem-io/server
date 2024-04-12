import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const spaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME_1,
    description: 'The left column on the Home page.',
  },
  {
    displayName: CalloutGroupName.HOME_2,
    description: 'The right column on the Home page.',
  },
  {
    displayName: CalloutGroupName.COMMUNITY_1,
    description: 'The left column on the Community page.',
  },
  {
    displayName: CalloutGroupName.COMMUNITY_2,
    description: 'The right column on the Community page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_1,
    description: 'The left column on the Subspaces page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_2,
    description: 'The right column on the Subspaces page.',
  },
  {
    displayName: CalloutGroupName.KNOWLEDGE,
    description: 'The knowledge page.',
  },
];
