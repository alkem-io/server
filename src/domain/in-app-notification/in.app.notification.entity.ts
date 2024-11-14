import { Column, Entity } from 'typeorm';
import { NotificationEventType } from '@alkemio/notifications-lib';
import { ENUM_LENGTH, UUID_LENGTH } from '@constants/index';
import { BaseAlkemioEntity } from '../common/entity/base-entity/base.alkemio.entity';
import { InAppNotificationState } from './in.app.notification.state';

// todo: use json
// todo: comments
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
    comment: '', //todo comment
  })
  category!: string; // todo type

  @Column('char', {
    length: UUID_LENGTH,
    nullable: false,
    comment: 'The contributor of Who is the receiver of this notification',
  })
  receiverID!: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment: 'The contributor who triggered the event, if applicable.',
  })
  triggeredByID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'The affected resource. Different entity based on the notification. Not a contributor.',
  })
  resourceID?: string;

  @Column('char', {
    length: UUID_LENGTH,
    nullable: true,
    comment:
      'Main contributor in the event, if applicable. Different from triggeredBy',
  })
  contributorID?: string;

  // action: string; // todo type ???
}
