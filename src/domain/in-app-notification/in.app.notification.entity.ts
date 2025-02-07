import { Column, Entity } from 'typeorm';
import {
  InAppNotificationCategory,
  InAppNotificationPayload,
  NotificationEventType,
} from '@alkemio/notifications-lib';
import { ENUM_LENGTH, UUID_LENGTH } from '@constants/index';
import { BaseAlkemioEntity } from '../common/entity/base-entity/base.alkemio.entity';
import { InAppNotificationState } from './in.app.notification.state';

@Entity('in_app_notification')
export class InAppNotificationEntity extends BaseAlkemioEntity {
  @Column({ type: 'datetime', comment: 'UTC', nullable: false })
  triggeredAt!: Date;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: NotificationEventType;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  state!: InAppNotificationState;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    comment: 'Which category (role) is this notification targeted to.',
  })
  category!: InAppNotificationCategory;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: false,
    comment: 'The contributor who is the receiver of this notification',
  })
  receiverID!: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment: 'The contributor who triggered the event, if applicable.',
  })
  triggeredByID?: string;

  @Column('json', {
    nullable: false,
    comment: 'Holds the original notification payload as it was received',
  })
  payload!: InAppNotificationPayload;
}
