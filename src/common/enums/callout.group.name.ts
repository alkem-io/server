import { registerEnumType } from '@nestjs/graphql';

export enum CalloutGroupName {
  HOME = 'HOME',
  COMMUNITY = 'COMMUNITY',
  CONTRIBUTE = 'CONTRIBUTE',
  KNOWLEDGE = 'KNOWLEDGE',
  SUBSPACES = 'SUBSPACES',
  CUSTOM = 'CUSTOM',
}

registerEnumType(CalloutGroupName, {
  name: 'CalloutGroupName',
});
