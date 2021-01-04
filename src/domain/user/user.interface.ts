import { IDID } from '@domain/did/did.interface';
import { IProfile } from '@domain/profile/profile.interface';
import { IUserGroup } from '@domain/user-group/user-group.interface';

export interface IUser {
  id: number;
  name: string;
  accountUpn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  gender: string;
  DID: IDID;
  profile?: IProfile;
  userGroups?: IUserGroup[];
  lastModified: number;
}
