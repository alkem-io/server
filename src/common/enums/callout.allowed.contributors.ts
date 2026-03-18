import { registerEnumType } from '@nestjs/graphql';

export enum CalloutAllowedActors {
  MEMBERS = 'members',
  ADMINS = 'admins',
  NONE = 'none',
}

registerEnumType(CalloutAllowedActors, {
  name: 'CalloutAllowedActors',
});

/** @deprecated REMOVE_AFTER=2026-09-01 | Use CalloutAllowedActors instead */
export const CalloutAllowedContributors = CalloutAllowedActors;
/** @deprecated REMOVE_AFTER=2026-09-01 | Use CalloutAllowedActors instead */
export type CalloutAllowedContributors = CalloutAllowedActors;
