import { ITag } from './ITag';
import { IUser } from './IUser';

export interface IUserGroup {
    id: number;
    name: string;
    members: IUser[];
    focalPoint: IUser;
    tags: ITag[];
  }