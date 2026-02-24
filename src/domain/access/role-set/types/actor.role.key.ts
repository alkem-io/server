import { ActorContext } from '@core/actor-context/actor.context';
import { IRoleSet } from '../role.set.interface';

export type ActorRoleKey = {
  actorContext: ActorContext;
  roleSet: IRoleSet;
};
