import { IProfile } from '@domain/community/profile/profile.interface';
import { IUser } from '@domain/community/user/user.interface';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser | null; // because of https://github.com/typeorm/typeorm/issues/5454
  profile?: IProfile;
  includeInSearch: boolean;
}
