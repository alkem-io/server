import { IUser } from '@domain/community/user';

export interface ICredential {
  id: number;
  user?: IUser;
  resourceID: number;
  type: string;
}
