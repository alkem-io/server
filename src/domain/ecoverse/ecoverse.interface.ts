import { IChallenge } from '../challenge/challenge.interface';
import { IContext } from '../context/context.interface';
import { IDID } from '../did/did.interface';
import { IOrganisation } from '../organisation/organisation.interface';
import { ITag } from '../tag/tag.interface';
import { IUserGroup } from '../user-group/user-group.interface';
import { IUser } from '../user/user.interface';

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
