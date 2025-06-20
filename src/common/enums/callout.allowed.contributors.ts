import { registerEnumType } from '@nestjs/graphql';

export enum CalloutAllowedContributors {
  MEMBERS = 'members',
  ADMIN = 'admin',
  NONE = 'none',
}

registerEnumType(CalloutAllowedContributors, {
  name: 'CalloutAllowedContributors',
});
