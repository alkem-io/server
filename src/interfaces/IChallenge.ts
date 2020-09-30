import { ITag } from './ITag';
import { IContext } from './IContext';
import { IUserGroup } from './IUserGroup';
import { IOrganisation } from './IOrganisation';
import { IUser } from './IUser';
import { IProject } from './IProject';

export interface IChallenge {
  id: number;
  name: string;
  lifecyclePhase?: string;
  context?: IContext;
  tags?: ITag[];
  groups?: IUserGroup[];
  contributors?: IUser[];
  projects?: IProject[];
  challengeLeads?: IOrganisation[];
}
