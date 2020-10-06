import { IDID } from "src/did/did.interface";
import { ITag } from "src/tag/tag.interface";

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
