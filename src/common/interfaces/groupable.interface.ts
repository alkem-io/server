import { IUserGroup } from '@domain/community/user-group/user-group.interface';

export interface IGroupable {
  id: string;
  name: string;
  groups?: IUserGroup[];
}
