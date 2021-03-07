import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IDID } from '@domain/agent/did/did.interface';
import { IOrganisation } from '@domain/community/organisation/organisation.interface';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Application } from '@domain/community/application/application.entity';

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
  applications?: Application[];
}
