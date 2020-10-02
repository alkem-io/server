import { IUser, IProfile } from '.';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser;
  profile: IProfile;
}
