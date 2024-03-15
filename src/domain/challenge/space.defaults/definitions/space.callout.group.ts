import { SpaceCalloutGroupName } from '@common/enums/space.callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const spaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: SpaceCalloutGroupName.HOME_LEFT,
    description: 'The left column on the Home page.',
  },
  {
    displayName: SpaceCalloutGroupName.HOME_RIGHT,
    description: 'The right column on the Home page.',
  },
  {
    displayName: SpaceCalloutGroupName.COMMUNITY_LEFT,
    description: 'The left column on the Community page.',
  },
  {
    displayName: SpaceCalloutGroupName.COMMUNITY_RIGHT,
    description: 'The right column on the Community page.',
  },
  {
    displayName: SpaceCalloutGroupName.SUBSPACES_LEFT,
    description: 'The left column on the Subspaces page.',
  },
  {
    displayName: SpaceCalloutGroupName.SUBSPACES_RIGHT,
    description: 'The right column on the Subspaces page.',
  },
  {
    displayName: SpaceCalloutGroupName.KNOWLEDGE,
    description: 'The knowledge page.',
  },
];
