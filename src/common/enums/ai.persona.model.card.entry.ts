import { registerEnumType } from '@nestjs/graphql';

export enum AiPersonaModelCardEntry {
  SPACE_CAPABILITIES = 'space-capabilities',
  SPACE_DATA_ACCESS = 'space-data-access',
  SPACE_ROLE_REQUIRED = 'space-role-required',
}

registerEnumType(AiPersonaModelCardEntry, {
  name: 'AiPersonaModelCardEntry',
});
