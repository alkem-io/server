import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community';
import { ITagset } from '@domain/common/tagset';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ICollaboration } from '@domain/collaboration';

export interface IOpportunity {
  id: number;
  name: string;
  textID: string;
  lifecycle?: ILifecycle;
  context?: IContext;
  community?: ICommunity;
  tagset?: ITagset;
  actorGroups?: IActorGroup[];
  restrictedActorGroupNames: string[];
  aspects?: IAspect[];
  collaboration?: ICollaboration;
}
