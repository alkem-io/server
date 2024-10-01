import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const spaceDefaultsCalloutGroupsOpportunity: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME,
    description: 'The Subspace Home page.',
  },
];
