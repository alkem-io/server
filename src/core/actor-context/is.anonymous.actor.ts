import { ANONYMOUS_ACTOR_ID } from '@core/auth/oidc/constants';

/**
 * Returns if an actor identifier is an anonymous actor.
 * This DOES NOT mean the actor is a guest user.
 * @param actorId
 */
export const isAnonymousActor = (actorId: string) => {
  return actorId.trim().length === 0 || actorId === ANONYMOUS_ACTOR_ID;
};
