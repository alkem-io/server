import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IProject } from '@domain/collaboration/project/project.interface';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Application } from '@domain/community/application/application.entity';

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
  applications?: Application[];
}
