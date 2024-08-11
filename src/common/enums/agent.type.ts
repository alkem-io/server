import { registerEnumType } from '@nestjs/graphql';

export enum AgentType {
  USER = 'user',
  ORGANIZATION = 'organization',
  VIRTUAL_CONTRIBUTOR = 'virtual-contributor',
  SPACE = 'space',
  ACCOUNT = 'account',
}

registerEnumType(AgentType, {
  name: 'AgentType',
});
