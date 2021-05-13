import { IProfile } from '@domain/community/profile/profile.interface';

export interface IUserGroup {
  id: number;
  name: string;
  profile?: IProfile;
}
