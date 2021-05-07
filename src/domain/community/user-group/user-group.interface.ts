import { IProfile } from '@domain/community/profile/profile.interface';
import { IUser } from '@domain/community/user/user.interface';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  profile?: IProfile;
}
