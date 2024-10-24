import { CalloutGroupName } from '@common/enums/callout.group.name';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';

export const bootstrapSubspaceKnowledgeCalloutGroups: ICalloutGroup[] = [
  {
    displayName: CalloutGroupName.HOME,
    description: 'The Subspace Home page.',
  },
];
