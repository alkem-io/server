import { IUserGroup } from '@domain/community/user-group/user-group.interface';

export interface IGroupable {
  id: number;
  name: string;
  groups?: IUserGroup[];
  restrictedGroupNames?: string[];
}
