import { registerEnumType } from '@nestjs/graphql';

export enum ContentUpdatePolicy {
  OWNER = 'owner',
  OWNER_ADMINS = 'owner-admins',
  OWNER_CONTRIBUTORS = 'owner-contributors',
}

registerEnumType(ContentUpdatePolicy, {
  name: 'ContentUpdatePolicy',
});
