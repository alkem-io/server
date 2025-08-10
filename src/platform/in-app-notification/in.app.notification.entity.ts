import { Column, Entity } from 'typeorm';
import { ENUM_LENGTH, UUID_LENGTH } from '@constants/index';
import { BaseAlkemioEntity } from '../../domain/common/entity/base-entity/base.alkemio.entity';
import { InAppNotificationState } from '../../common/enums/in.app.notification.state';
import { IInAppNotification } from './in.app.notification.interface';
import { InAppNotificationCategory } from '@common/enums/in.app.notification.category';
import { InAppNotificationPayloadBase } from '@services/cluster/in-app-notification-receiver/dto/in.app.notification.receiver.payload.base';
import { InAppNotificationEventType } from '@common/enums/in.app.notification.event.type';

@Entity('in_app_notification')
export class InAppNotificationEntity
  extends BaseAlkemioEntity
  implements IInAppNotification
{
  @Column({ type: 'datetime', comment: 'UTC', nullable: false })
  triggeredAt!: Date;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: InAppNotificationEventType;

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
  payload!: InAppNotificationPayloadBase;
}
