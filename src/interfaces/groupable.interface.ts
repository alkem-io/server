import { IUserGroup } from '../user-group/user-group.interface';

export interface IGroupable {
  groups?: IUserGroup[];
  restrictedGroupNames?: string[];
}
