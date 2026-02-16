import { IUser } from '../user/user.interface';

export type UserAuthenticationLinkConflictMode = 'error' | 'log';

export type UserAuthenticationLinkResolveOptions = {
  with?: Record<string, boolean | object>;
  conflictMode?: UserAuthenticationLinkConflictMode;
  lookupByAuthenticationId?: boolean;
};

export enum UserAuthenticationLinkMatch {
  AUTHENTICATION_ID = 'authentication-id',
  EMAIL = 'email',
}

export enum UserAuthenticationLinkOutcome {
  ALREADY_LINKED = 'already-linked',
  LINKED = 'linked',
  NO_AUTH_PROVIDED = 'no-auth-provided',
  CONFLICT = 'conflict',
}

export interface UserAuthenticationLinkResult {
  user: IUser;
  matchedBy: UserAuthenticationLinkMatch;
  outcome: UserAuthenticationLinkOutcome;
}
