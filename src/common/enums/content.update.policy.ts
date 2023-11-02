import { registerEnumType } from '@nestjs/graphql';

export enum ContentUpdatePolicy {
  OWNER = 'owner',
  ADMINS = 'admins',
  CONTRIBUTORS = 'contributors',
}

registerEnumType(ContentUpdatePolicy, {
  name: 'ContentUpdatePolicy',
});
