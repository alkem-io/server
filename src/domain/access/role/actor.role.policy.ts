import { IActorRolePolicy } from './actor.role.policy.interface';

export class ActorRolePolicy implements IActorRolePolicy {
  minimum: number;
  maximum: number;

  constructor() {
    this.minimum = -1;
    this.maximum = -1;
  }
}
