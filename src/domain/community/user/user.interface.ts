import { IProfile } from '@domain/community/profile';
import { IAgent } from '@domain/agent';

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
  profile?: IProfile;
  agent?: IAgent;
}
