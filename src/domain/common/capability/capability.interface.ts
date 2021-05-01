import { IUser } from '@domain/community/user';

export interface ICapability {
  id: number;
  user?: IUser;
  subjectID: number;
  privilege: string;
}
