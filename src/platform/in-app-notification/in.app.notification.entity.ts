import { Column, Entity, Generated, ManyToOne, JoinColumn } from 'typeorm';
import { ENUM_LENGTH, UUID_LENGTH } from '@constants/index';
import { BaseAlkemioEntity } from '../../domain/common/entity/base-entity/base.alkemio.entity';
import { NotificationEventInAppState } from '../../common/enums/notification.event.in.app.state';
import { IInAppNotification } from './in.app.notification.interface';
import { NotificationEventCategory } from '@common/enums/notification.event.category';
import { NotificationEvent } from '@common/enums/notification.event';
import { IInAppNotificationPayload } from '@platform/in-app-notification-payload/in.app.notification.payload.interface';
import { Space } from '@domain/space/space/space.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { Application } from '@domain/access/application/application.entity';
import { Invitation } from '@domain/access/invitation/invitation.entity';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';

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

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: false,
    persistence: false,
  })
  @JoinColumn({ name: 'receiverID' })
  receiver?: User;

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

  @ManyToOne(() => Space, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'spaceID' })
  space?: Space;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment: 'FK to Space - cascade deletes notification when space is deleted',
  })
  spaceID?: string;

  @ManyToOne(() => Organization, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'organizationID' })
  organization?: Organization;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Organization - cascade deletes notification when organization is deleted',
  })
  organizationID?: string;

  @ManyToOne(() => User, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'userID' })
  user?: User;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to User - cascade deletes notification when referenced user is deleted',
  })
  userID?: string;

  @ManyToOne(() => Application, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'applicationID' })
  application?: Application;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Application - cascade deletes notification when application is deleted',
  })
  applicationID?: string;

  @ManyToOne(() => Invitation, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'invitationID' })
  invitation?: Invitation;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Invitation - cascade deletes notification when invitation is deleted',
  })
  invitationID?: string;

  @ManyToOne(() => Callout, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'calloutID' })
  callout?: Callout;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to Callout - cascade deletes notification when callout is deleted',
  })
  calloutID?: string;

  @ManyToOne(() => CalloutContribution, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: true,
    persistence: false,
  })
  @JoinColumn({ name: 'contributionID' })
  contribution?: CalloutContribution;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'FK to CalloutContribution - cascade deletes notification when contribution is deleted',
  })
  contributionID?: string;
}
