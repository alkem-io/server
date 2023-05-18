import { registerEnumType } from '@nestjs/graphql';

export enum DocumentLocationResultType {
  HUB = 'hub',
  CHALLENGE = 'challenge',
  USER = 'user',
  ORGANIZATION = 'organization',
  PLATFORM = 'platform',
}

registerEnumType(DocumentLocationResultType, {
  name: 'DocumentLocationResultType',
});
