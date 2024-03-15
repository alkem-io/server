import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const spaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME_LEFT,
    description: 'The left column on the Home page.',
  },
  {
    displayName: CalloutGroupName.HOME_RIGHT,
    description: 'The right column on the Home page.',
  },
  {
    displayName: CalloutGroupName.COMMUNITY_LEFT,
    description: 'The left column on the Community page.',
  },
  {
    displayName: CalloutGroupName.COMMUNITY_RIGHT,
    description: 'The right column on the Community page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_LEFT,
    description: 'The left column on the Subspaces page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_RIGHT,
    description: 'The right column on the Subspaces page.',
  },
  {
    displayName: CalloutGroupName.KNOWLEDGE,
    description: 'The knowledge page.',
  },
];
