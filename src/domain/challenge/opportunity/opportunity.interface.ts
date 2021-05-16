import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { ICommunity } from '@domain/community/community';
import { ITagset } from '@domain/common/tagset';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';

export interface IOpportunity {
  id: number;
  name: string;
  textID: string;
  lifecycle?: ILifecycle;
  context?: IContext;
  community?: ICommunity;
  tagset?: ITagset;
  projects?: IProject[];
  actorGroups?: IActorGroup[];
  RestrictedActorGroupName: string[];
  aspects?: IAspect[];
  relations?: IRelation[];
}
