import { ITagset } from './ITagset';
import { IDID } from './IDID';
import { IUser } from './IUser';
import { IChallenge } from './IChallenge';

export interface IOrganisation {
  id: number;
  name: string;
  DID: IDID;
  tagset?: ITagset;
  members?: IUser[];
  challenges?: IChallenge[];
}
