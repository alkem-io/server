import { ITagset } from './ITagset';
import { IDID } from './IDID';
import { IOrganisation } from './IOrganisation';
import { IUser } from './IUser';
import { IUserGroup } from './IUserGroup';
import { IChallenge } from './IChallenge';
import { IContext } from './IContext';

export interface IEcoverse {
  id: number;
  name: string;
  ecoverseHost?: IOrganisation;
  context?: IContext;
  DID: IDID;
  members?: IUser[];
  groups?: IUserGroup[];
  partners?: IOrganisation[];
  challenges?: IChallenge[];
  tagset?: ITagset;
}
