import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IDID } from '@domain/agent/did/did.interface';
import { IProfile } from '@domain/community/profile/profile.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';

export interface IOrganisation {
  id: number;
  name: string;
  textID: string;
  DID: IDID;
  profile?: IProfile;
  challenges?: IChallenge[];
  groups?: IUserGroup[];
  restrictedGroupNames?: string[];
}
