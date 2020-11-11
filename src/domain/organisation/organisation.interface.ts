import { IChallenge } from '../challenge/challenge.interface';
import { IDID } from '../did/did.interface';
import { IProfile } from '../profile/profile.interface';
import { IUserGroup } from '../user-group/user-group.interface';

export interface IOrganisation {
  id: number;
  name: string;
  DID: IDID;
  profile?: IProfile;
  challenges?: IChallenge[];
  groups?: IUserGroup[];
  restrictedGroupNames?: string[];
}
