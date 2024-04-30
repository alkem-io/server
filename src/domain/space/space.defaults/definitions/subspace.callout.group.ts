import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const subspaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME,
    description: 'The Home page.',
  },
  {
    displayName: CalloutGroupName.CONTRIBUTE,
    description: 'The Contribute page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES,
    description: 'The Subspaces page.',
  },
];
