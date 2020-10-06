import { IContext } from "src/context/context.interface";
import { IOrganisation } from "src/organisation/organisation.interface";
import { IProject } from "src/project/project.interface";
import { ITag } from "src/tag/tag.interface";
import { IUserGroup } from "src/user-group/user-group.interface";
import { IUser } from "src/user/user.interface";


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
