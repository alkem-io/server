import { IUser } from '../user/user.interface';

export interface ITemplate {
  id: number;
  name: string;
  description: string;
  users?: IUser[];
}
