import { IEcoverse } from '../ecoverse/ecoverse.interface';
import { IProfile } from '../profile/profile.interface';
import { IUser } from '../user/user.interface';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser | null; // because of https://github.com/typeorm/typeorm/issues/5454
  profile?: IProfile;
  ecoverse?: IEcoverse;
  includeInSearch: boolean;
}
