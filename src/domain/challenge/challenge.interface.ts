import { IContext } from '../context/context.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { IProject } from '../project/project.interface';
import { ITagset } from '../tagset/tagset.interface';
import { IUserGroup } from '../user-group/user-group.interface';
import { IUser } from '../user/user.interface';

export interface IChallenge {
  id: number;
  name: string;
  textID: string;
  lifecyclePhase?: string;
  context?: IContext;
  tagset?: ITagset;
  groups?: IUserGroup[];
  contributors?: IUser[];
  projects?: IProject[];
  challengeLeads?: IOrganisation[];
  restrictedGroupNames: string[];
}
