import { registerEnumType } from '@nestjs/graphql';

export enum AiServerAuthorizationPrivilege {
  AI_SERVER_ADMIN = 'ai-server-admin',
}

registerEnumType(AiServerAuthorizationPrivilege, {
  name: 'AiServerAuthorizationPrivilege',
});
