import { ITag } from './ITag';
import { IDID } from './IDID';

export interface IUser {
    id: number;
    name: string;
    account: string;
    firstName: string;
    lastName: string;
    email: string;
    DID: IDID;
    tags?: ITag[];
  }
