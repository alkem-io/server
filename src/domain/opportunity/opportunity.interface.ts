import { IActorGroup } from '@domain/actor-group/actor-group.interface';
import { IAspect } from '@domain/aspect/aspect.interface';
import { IContext } from '@domain/context/context.interface';
import { IProject } from '@domain/project/project.interface';
import { IRelation } from '@domain/relation/relation.interface';
import { IUserGroup } from '@domain/user-group/user-group.interface';

export interface IOpportunity {
  id: number;
  name: string;
  textID: string;
  state: string;
  context?: IContext;
  projects?: IProject[];
  actorGroups?: IActorGroup[];
  groups?: IUserGroup[];
  restrictedActorGroupNames: string[];
  restrictedGroupNames: string[];
  aspects?: IAspect[];
  relations?: IRelation[];
}
