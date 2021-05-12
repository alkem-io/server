import { IUser } from '@domain/community/user';

export interface IAuthorizationRule {
  execute(user: IUser): boolean;
  priority: number;
}
