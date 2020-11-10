import { IActor } from '../actor/actor.interface';

export interface IActorGroup {
  id: number;
  name: string;
  description: string;
  actors?: IActor[];
}
