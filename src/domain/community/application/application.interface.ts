import { Question } from '@domain/community/application';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ICommunity } from '../community';
import { IUser } from '../user';

export interface IApplication {
  id: number;
  user?: IUser;
  community?: ICommunity;
  lifecycle?: ILifecycle;
  questions?: Question[];
}
