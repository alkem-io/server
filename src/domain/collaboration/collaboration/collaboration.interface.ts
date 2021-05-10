import { IRelation } from '@domain/collaboration/relation';
import { IProject } from '@domain/collaboration/project';

export interface ICollaboration {
  id: number;
  projects?: IProject[];
  relations?: IRelation[];
}
