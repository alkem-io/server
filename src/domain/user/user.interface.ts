import { IDID } from '../did/did.interface';
import { IProfile } from '../profile/profile.interface';
import { IUserGroup } from '../user-group/user-group.interface';

export interface IUser {
  id: number;
  name: string;
  account: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  gender: string;
  DID: IDID;
  profile: IProfile;
  userGroups?: Promise<IUserGroup[]>;
}
