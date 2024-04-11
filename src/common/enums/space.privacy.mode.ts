import { registerEnumType } from '@nestjs/graphql';

export enum SpacePrivacyMode {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

registerEnumType(SpacePrivacyMode, {
  name: 'SpacePrivacyMode',
});
