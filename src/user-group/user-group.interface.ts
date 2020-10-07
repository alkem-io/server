import { ITag } from '../tag/tag.interface';
import { IUser } from '../user/user.interface';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser;
  tags?: ITag[];
  //addUserToGroup(newUser: IUser): IUser;
  //initialiseMembers(): IUserGroup;
}
