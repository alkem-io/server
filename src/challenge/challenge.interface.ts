import { IContext } from '../context/context.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { IProject } from '../project/project.interface';
import { ITag } from '../tag/tag.interface';
import { IUserGroup } from '../user-group/user-group.interface';
import { IUser } from '../user/user.interface';

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
  restrictedGroupNames?: string[];
}
