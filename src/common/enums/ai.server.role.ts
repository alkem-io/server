import { registerEnumType } from '@nestjs/graphql';

export enum AiServerRole {
  GLOBAL_ADMIN = 'global-admin',
  SUPPORT = 'support',
}

registerEnumType(AiServerRole, {
  name: 'AiServerRole',
});
