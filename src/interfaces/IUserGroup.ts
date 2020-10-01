import { ITagset } from './ITagset';
import { IUser } from './IUser';

export interface IUserGroup {
  id: number;
  name: string;
  members?: IUser[];
  focalPoint?: IUser;
  tagset?: ITagset;
}
