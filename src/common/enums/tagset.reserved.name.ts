import { registerEnumType } from '@nestjs/graphql';

export enum TagsetReservedName {
  DEFAULT = 'default',
  FLOW_STATE = 'flow-state',
  SKILLS = 'skills',
  CAPABILITIES = 'capabilities',
  KEYWORDS = 'keywords',
}

registerEnumType(TagsetReservedName, {
  name: 'TagsetReservedName',
});
