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
}
