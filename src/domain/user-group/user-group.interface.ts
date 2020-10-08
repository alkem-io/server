import { IProfile } from '../profile/profile.interface';
import { IUser } from '../user/user.interface';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser;
  profile?: IProfile;
}
