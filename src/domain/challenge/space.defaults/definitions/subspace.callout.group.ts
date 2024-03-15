import { SubspaceCalloutGroupName } from '@common/enums/subspace.callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const subspaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: SubspaceCalloutGroupName.HOME_LEFT,
    description: 'The left column on the Home page.',
  },
  {
    displayName: SubspaceCalloutGroupName.HOME_RIGHT,
    description: 'The right column on the Home page.',
  },
  {
    displayName: SubspaceCalloutGroupName.CONTRIBUTE_LEFT,
    description: 'The left column on the Contribute page.',
  },
  {
    displayName: SubspaceCalloutGroupName.CONTRIBUTE_RIGHT,
    description: 'The right column on the Contribute page.',
  },
  {
    displayName: SubspaceCalloutGroupName.SUBSPACES_LEFT,
    description: 'The left column on the Subspaces page.',
  },
  {
    displayName: SubspaceCalloutGroupName.SUBSPACES_RIGHT,
    description: 'The right column on the Subspaces page.',
  },
];
