import { IUserGroup } from '../../domain/user-group/user-group.interface';
import { IUser } from '../../domain/user/user.interface';

export interface ISearchResult {
  score: number;
  user?: IUser;
  group?: IUserGroup;
}
