import { IChallenge } from '@domain/challenge/challenge.interface';
import { IContext } from '@domain/context/context.interface';
import { IDID } from '@domain/did/did.interface';
import { IOrganisation } from '@domain/organisation/organisation.interface';
import { ITagset } from '@domain/tagset/tagset.interface';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { IUser } from '@domain/user/user.interface';

export interface IEcoverse {
  id: number;
  name: string;
  host?: IOrganisation;
  context?: IContext;
  DID: IDID;
  members?: IUser[];
  groups?: IUserGroup[];
  organisations?: IOrganisation[];
  challenges?: IChallenge[];
  tagset?: ITagset;
  restrictedGroupNames: string[];
}
