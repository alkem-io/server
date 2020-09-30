import { IContext } from './IContext';
import { IUserGroup } from './IUserGroup';
import { IOrganisation } from './IOrganisation';
import { IUser } from './IUser';
import { IProject } from './IProject';
import { ITagset } from './ITagset';

export interface IChallenge {
  id: number;
  name: string;
  lifecyclePhase?: string;
  context?: IContext;
  tagset: ITagset;
  groups?: IUserGroup[];
  contributors?: IUser[];
  projects?: IProject[];
  challengeLeads?: IOrganisation[];
}
