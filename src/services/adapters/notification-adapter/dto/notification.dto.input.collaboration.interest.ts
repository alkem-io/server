import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { NotificationInputBase } from './notification.dto.input.base';

export interface NotificationInputCollaborationInterest
  extends NotificationInputBase {
  relation: IRelation;
  collaboration: ICollaboration;
}
