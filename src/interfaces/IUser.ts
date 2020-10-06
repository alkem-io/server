import { IDID } from './IDID';
import { IProfile } from './IProfile';

export interface IUser {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  country: string;
  gender: string;
  DID: IDID;
  profile: IProfile;
}
