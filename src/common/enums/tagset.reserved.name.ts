import { registerEnumType } from '@nestjs/graphql';

export enum TagsetReservedName {
  DEFAULT = 'default',
  DISPLAY_LOCATION_SPACE = 'display-location-space',
  DISPLAY_LOCATION_CHALLENGE = 'display-location-challenge',
  FLOW_STATE = 'flow-state',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

registerEnumType(TagsetReservedName, {
  name: 'TagsetReservedName',
});
