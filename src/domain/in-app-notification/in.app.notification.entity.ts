import { Column, Entity } from 'typeorm';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { ENUM_LENGTH, UUID_LENGTH } from '@constants/index';
import { BaseAlkemioEntity } from '../common/entity/base-entity/base.alkemio.entity';
import { InAppNotificationState } from './in.app.notification.state';

// todo: comments
@Entity('in_app_notification')
export class InAppNotificationEntity extends BaseAlkemioEntity {
  @Column({ type: 'datetime', comment: 'UTC', nullable: false })
  triggeredAt!: number;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: NotificationEventType;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  state!: InAppNotificationState;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: false,
    comment: 'Who triggered the event',
  })
  triggeredByID!: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: false,
    comment:
      'The affected resource. Different entity based on the notification',
  })
  resourceID!: string;

  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
    comment: '', //todo comment
  })
  category!: string; // todo type

  @Column('char', {
    length: UUID_LENGTH,
    nullable: false,
    comment: 'Who is the receiver of this notification',
  })
  receiverID!: string;

  // action: string; // todo type ???
}
