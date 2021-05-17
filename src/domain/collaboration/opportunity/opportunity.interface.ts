import { IRelation } from '@domain/collaboration/relation';
import { IProject } from '@domain/collaboration/project';

export interface IOpportunity {
  id: number;
  projects?: IProject[];
  relations?: IRelation[];
}
