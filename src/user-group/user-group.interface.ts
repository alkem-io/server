import { ITag } from "src/tag/tag.interface";
import { IUser } from "src/user/user.interface";

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser;
  tags?: ITag[];
  //addUserToGroup(newUser: IUser): IUser;
  //initialiseMembers(): IUserGroup;
}
