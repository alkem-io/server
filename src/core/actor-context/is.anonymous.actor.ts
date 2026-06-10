import { ANONYMOUS_ACTOR_ID } from '@core/auth/oidc/constants';

export const isAnonymousActor = (actorId: string) => {
  return actorId.trim().length === 0 || actorId === ANONYMOUS_ACTOR_ID;
};
