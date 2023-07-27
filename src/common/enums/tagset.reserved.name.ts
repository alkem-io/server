import { registerEnumType } from '@nestjs/graphql';

export enum TagsetReservedName {
  DEFAULT = 'default',
  CALLOUT_DISPLAY_LOCATION = 'callout-display-location',
  FLOW_STATE = 'flow-state',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

registerEnumType(TagsetReservedName, {
  name: 'TagsetReservedName',
});
