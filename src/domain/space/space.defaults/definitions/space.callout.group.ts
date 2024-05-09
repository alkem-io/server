import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const spaceCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME,
    description: 'The Home page.',
  },
  {
    displayName: CalloutGroupName.COMMUNITY,
    description: 'The Community page.',
  },
  {
    displayName: CalloutGroupName.SUBSPACES,
    description: 'The Subspaces page.',
  },
  {
    displayName: CalloutGroupName.KNOWLEDGE,
    description: 'The knowledge page.',
  },
];
