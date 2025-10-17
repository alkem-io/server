import { Column, Entity, Generated } from 'typeorm';
import { ENUM_LENGTH, UUID_LENGTH } from '@constants/index';
import { BaseAlkemioEntity } from '../../domain/common/entity/base-entity/base.alkemio.entity';
import { NotificationEventInAppState } from '../../common/enums/notification.event.in.app.state';
import { IInAppNotification } from './in.app.notification.interface';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';

@Entity('in_app_notification')
export class InAppNotification
  extends BaseAlkemioEntity
  implements IInAppNotification
{
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: NotificationEvent;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  state!: NotificationEventInAppState;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    comment: 'Which category (role) is this notification targeted to.',
  })
  category!: NotificationEventCategory;

  @Column({ type: 'datetime', comment: 'UTC', nullable: false })
  triggeredAt!: Date;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment: 'The contributor who triggered the event.',
  })
  triggeredByID!: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: false,
    comment: 'The contributor who is the receiver of this notification',
  })
  receiverID!: string;

  @Column('json', {
    nullable: false,
    comment: 'Additional data that is relevant for this Notification.',
  })
  payload!: IInAppNotificationPayload;

  // Core entity foreign keys - cascade delete when these entities are removed
  // Only the applicable FK will be populated per notification type
  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment: 'FK to Space - cascade deletes notification when space is deleted',
  })
  spaceID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Organization - cascade deletes notification when organization is deleted',
  })
  organizationID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to User - cascade deletes notification when referenced user is deleted',
  })
  userID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Application - cascade deletes notification when application is deleted',
  })
  applicationID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Invitation - cascade deletes notification when invitation is deleted',
  })
  invitationID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Callout - cascade deletes notification when callout is deleted',
  })
  calloutID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Callout Contribution - cascade deletes notification when Contribution is deleted',
  })
  contributionID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Room - cascade deletes notification when the room is deleted',
  })
  roomID?: string;

  @Column('char', {
    length: 44,
    nullable: true,
    comment:
      'Not actual FK - used to manually delete notification when the message is deleted',
  })
  messageID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Organization - cascade deletes notification when organization contributor is deleted',
  })
  contributorOrganizationID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to User - cascade deletes notification when user contributor is deleted',
  })
  contributorUserID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to VC - cascade deletes notification when VC contributor is deleted',
  })
  contributorVcID?: string;
}
