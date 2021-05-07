import { IUser } from '@domain/community/user';

export interface IAuthorizationRule {
  evaluate(user: IUser): boolean;
}
