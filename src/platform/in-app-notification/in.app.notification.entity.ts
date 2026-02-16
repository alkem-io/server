import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { Application } from '@domain/access/application/application.entity';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Room } from '@domain/communication/room/room.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Space } from '@domain/space/space/space.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { NotificationEventInAppState } from '../../common/enums/notification.event.in.app.state';
import { BaseAlkemioEntity } from '../../domain/common/entity/base-entity/base.alkemio.entity';
import { IInAppNotificationPayload } from '../in-app-notification-payload/in.app.notification.payload.interface';
import { IInAppNotification } from './in.app.notification.interface';

export class InAppNotification
  extends BaseAlkemioEntity
  implements IInAppNotification
{
  rowId!: number;

  type!: NotificationEvent;

  state!: NotificationEventInAppState;

  category!: NotificationEventCategory;

  triggeredAt!: Date;

  triggeredByID!: string;

  receiverID!: string;

  receiver?: User;

  payload!: IInAppNotificationPayload;

  // Core entity foreign keys - cascade delete when these entities are removed
  // Only the applicable FK will be populated per notification type
  spaceID?: string;

  space?: Space;

  organizationID?: string;

  organization?: Organization;

  userID?: string;

  user?: User;

  applicationID?: string;

  application?: Application;

  invitationID?: string;

  invitation?: Invitation;

  calloutID?: string;

  callout?: Callout;

  contributionID?: string;

  contribution?: CalloutContribution;

  roomID?: string;

  room?: Room;
  // No FK for messageID as they are in another database
  messageID?: string;

  contributorOrganizationID?: string;

  contributorOrganization?: Organization;

  contributorUserID?: string;

  contributorUser?: User;

  contributorVcID?: string;

  contributorVc?: VirtualContributor;

  calendarEventID?: string;

  calendarEvent?: CalendarEvent;
}
