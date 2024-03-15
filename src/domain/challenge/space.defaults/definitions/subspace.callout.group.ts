import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const subspaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME_LEFT,
    description: 'The left column on the Home page.',
  },
  {
    displayName: CalloutGroupName.HOME_RIGHT,
    description: 'The right column on the Home page.',
  },
  {
    displayName: CalloutGroupName.CONTRIBUTE_LEFT,
    description: 'The left column on the Contribute page.',
  },
  {
    displayName: CalloutGroupName.CONTRIBUTE_RIGHT,
    description: 'The right column on the Contribute page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_LEFT,
    description: 'The left column on the Subspaces page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_RIGHT,
    description: 'The right column on the Subspaces page.',
  },
];
