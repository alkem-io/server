import { IActor } from '@domain/context/actor/actor.interface';

export interface IActorGroup {
  id: number;
  name: string;
  description?: string;
  actors?: IActor[];
}
