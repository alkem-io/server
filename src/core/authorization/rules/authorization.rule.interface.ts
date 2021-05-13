import { UserInfo } from '@core/authentication/user-info';

export interface IAuthorizationRule {
  execute(user: UserInfo): boolean;
  priority: number;
}
