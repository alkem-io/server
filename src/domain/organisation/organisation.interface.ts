import { IChallenge } from '@domain/challenge/challenge.interface';
import { IDID } from '@domain/did/did.interface';
import { IProfile } from '@domain/profile/profile.interface';
import { IUserGroup } from '@domain/user-group/user-group.interface';

export interface IOrganisation {
  id: number;
  name: string;
  DID: IDID;
  profile?: IProfile;
  challenges?: IChallenge[];
  groups?: IUserGroup[];
  restrictedGroupNames?: string[];
}
