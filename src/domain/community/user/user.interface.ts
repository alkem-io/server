import { IProfile } from '@domain/community/profile/profile.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
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
  userGroups?: IUserGroup[];
  agent?: IAgent;
}
