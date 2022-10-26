import { IUser } from '@src/domain';

export interface IActivityLogEntryBase {
  id: string;
  triggeredBy: IUser;
  createdDate: Date;
  type: string;
  description: string | undefined;
  collaborationID: string;
}
