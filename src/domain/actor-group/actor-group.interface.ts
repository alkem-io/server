import { IActor } from '@domain/actor/actor.interface';

export interface IActorGroup {
  id: number;
  name: string;
  description: string;
  actors?: IActor[];
}
