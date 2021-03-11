import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { Application } from '@domain/community/application/application.entity';

export interface ICommunity {
  id: number;
  name: string;
  groups?: IUserGroup[];
  restrictedGroupNames: string[];
  applications?: Application[];
}
