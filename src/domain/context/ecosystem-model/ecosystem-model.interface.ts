import { IActorGroup } from '@domain/context';

export interface IEcosystemModel {
  id: number;
  description?: string;
  actorGroups?: IActorGroup[];
  restrictedActorGroupNames: string[];
}
