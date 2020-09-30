import { ITag } from './ITag';
import { IDID } from './IDID';
import { IUser } from './IUser';
import { IChallenge } from './IChallenge';

export interface IOrganisation {
  id: number;
  name: string;
  DID: IDID;
  tags?: ITag[];
  members?: IUser[];
  challenges?: IChallenge[];
}
