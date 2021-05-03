import { IUser } from '@domain/community/user';

export interface ICredential {
  id: number;
  user?: IUser;
  subjectID: number;
  privilege: string;
}
