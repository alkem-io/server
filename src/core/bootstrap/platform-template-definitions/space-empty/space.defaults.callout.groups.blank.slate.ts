import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const spaceDefaultsCalloutGroupsBlankSlate: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME,
    description: 'The Home page.',
  },
];
