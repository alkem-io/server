import { IChallenge } from 'src/challenge/challenge.interface';
import { IDID } from 'src/did/did.interface';
import { ITag } from 'src/tag/tag.interface';
import { IUserGroup } from 'src/user-group/user-group.interface';
import { IUser } from 'src/user/user.interface';

export interface IOrganisation {
  id: number;
  name: string;
  DID: IDID;
  tags?: ITag[];
  members?: IUser[];
  challenges?: IChallenge[];
  groups?: IUserGroup[];
  restrictedGroupNames?: string[];
}
