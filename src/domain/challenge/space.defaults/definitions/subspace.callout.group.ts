import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const subspaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME_1,
    description: 'The left column on the Home page.',
  },
  {
    displayName: CalloutGroupName.HOME_2,
    description: 'The right column on the Home page.',
  },
  {
    displayName: CalloutGroupName.CONTRIBUTE_1,
    description: 'The left column on the Contribute page.',
  },
  {
    displayName: CalloutGroupName.CONTRIBUTE_2,
    description: 'The right column on the Contribute page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_1,
    description: 'The left column on the Subspaces page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES_2,
    description: 'The right column on the Subspaces page.',
  },
];
