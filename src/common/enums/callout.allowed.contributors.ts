import { registerEnumType } from '@nestjs/graphql';

export enum CalloutAllowedContributors {
  MEMBERS = 'members',
  ADMINS = 'admins',
  NONE = 'none',
}

registerEnumType(CalloutAllowedContributors, {
  name: 'CalloutAllowedContributors',
});
