import { NotificationEvent } from '@common/enums/notification.event';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { ENUM_LENGTH } from '@constants/index';
import { Application } from '@domain/access/application/application.entity';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { Room } from '@domain/communication/room/room.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { Space } from '@domain/space/space/space.entity';
import { CalendarEvent } from '@domain/timeline/event';
import { Column, Entity, Generated, JoinColumn, ManyToOne } from 'typeorm';
import { NotificationEventInAppState } from '../../common/enums/notification.event.in.app.state';
import { BaseAlkemioEntity } from '../../domain/common/entity/base-entity/base.alkemio.entity';
import { IInAppNotificationPayload } from '../in-app-notification-payload/in.app.notification.payload.interface';
import { IInAppNotification } from './in.app.notification.interface';

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

  @Column({ type: 'timestamp', comment: 'UTC', nullable: false })
  triggeredAt!: Date;

  @Column('uuid', {
    nullable: true,
    comment: 'The contributor who triggered the event.',
  })
  triggeredByID!: string;

  @Column('uuid', {
    nullable: false,
    comment: 'The contributor who is the receiver of this notification',
  })
  receiverID!: string;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receiverID' })
  receiver?: User;

  @Column('jsonb', {
    nullable: false,
    comment: 'Additional data that is relevant for this Notification.',
  })
  payload!: IInAppNotificationPayload;

  // Core entity foreign keys - cascade delete when these entities are removed
  // Only the applicable FK will be populated per notification type
  @Column('uuid', {
    nullable: true,
    comment: 'FK to Space - cascade deletes notification when space is deleted',
  })
  spaceID?: string;

  @ManyToOne(() => Space, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'spaceID' })
  space?: Space;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Organization - cascade deletes notification when organization is deleted',
  })
  organizationID?: string;

  @ManyToOne(() => Organization, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationID' })
  organization?: Organization;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to User - cascade deletes notification when referenced user is deleted',
  })
  userID?: string;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userID' })
  user?: User;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Application - cascade deletes notification when application is deleted',
  })
  applicationID?: string;

  @ManyToOne(() => Application, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'applicationID' })
  application?: Application;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Invitation - cascade deletes notification when invitation is deleted',
  })
  invitationID?: string;

  @ManyToOne(() => Invitation, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invitationID' })
  invitation?: Invitation;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Callout - cascade deletes notification when callout is deleted',
  })
  calloutID?: string;

  @ManyToOne(() => Callout, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'calloutID' })
  callout?: Callout;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Callout Contribution - cascade deletes notification when Contribution is deleted',
  })
  contributionID?: string;

  @ManyToOne(() => CalloutContribution, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contributionID' })
  contribution?: CalloutContribution;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Room - cascade deletes notification when the room is deleted',
  })
  roomID?: string;

  @ManyToOne(() => Room, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomID' })
  room?: Room;
  // No FK for messageID as they are in another database
  @Column('varchar', {
    length: 44,
    nullable: true,
    comment:
      'Not actual FK - used to manually delete notification when the message is deleted',
  })
  messageID?: string;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Actor - cascade deletes notification when contributor is deleted',
  })
  contributorActorId?: string;

  @ManyToOne(() => Actor, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'contributorActorId' })
  contributorActor?: Actor;

  @Column('uuid', {
    nullable: true,
    comment:
      'FK to Calendar Event - cascade deletes notification when the calendar event is deleted',
  })
  calendarEventID?: string;

  @ManyToOne(() => CalendarEvent, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'calendarEventID' })
  calendarEvent?: CalendarEvent;
}
