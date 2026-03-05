import { registerEnumType } from '@nestjs/graphql';

export enum CalloutAllowedActors {
  MEMBERS = 'members',
  ADMINS = 'admins',
  NONE = 'none',
}

registerEnumType(CalloutAllowedActors, {
  name: 'CalloutAllowedActors',
});

/** @deprecated Use CalloutAllowedActors instead */
export const CalloutAllowedContributors = CalloutAllowedActors;
/** @deprecated Use CalloutAllowedActors instead */
export type CalloutAllowedContributors = CalloutAllowedActors;
