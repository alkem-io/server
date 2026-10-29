import { ActorType } from '@common/enums/actor.type';

/**
 * The actor types `ActorLoaderCreator` resolves. Any other actor type, like a
 * missing actor, resolves to nothing — so in-app notifications use the same
 * list to decide whether their triggering actor can be shown.
 */
export const LOADABLE_ACTOR_TYPES = [
  ActorType.USER,
  ActorType.ORGANIZATION,
  ActorType.VIRTUAL_CONTRIBUTOR,
];
