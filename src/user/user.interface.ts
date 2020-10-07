import { IDID } from '../did/did.interface';
import { ITag } from '../tag/tag.interface';

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
