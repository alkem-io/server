import { IChallenge } from 'src/challenge/challenge.interface';
import { IContext } from 'src/context/context.interface';
import { IDID } from 'src/did/did.interface';
import { IOrganisation } from 'src/organisation/organisation.interface';
import { ITag } from 'src/tag/tag.interface';
import { IUserGroup } from 'src/user-group/user-group.interface';
import { IUser } from 'src/user/user.interface';

export interface IEcoverse {
  id: number;
  name: string;
  host?: IOrganisation;
  context?: IContext;
  DID: IDID;
  members?: IUser[];
  groups?: IUserGroup[];
  partners?: IOrganisation[];
  challenges?: IChallenge[];
  tags?: ITag[];
  restrictedGroupNames?: string[];
}
