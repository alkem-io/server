import {
  ENUM_LENGTH,
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
} from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { User } from '@domain/community/user/user.entity';
import { PushSubscriptionStatus } from '@domain/push-subscription/push.subscription.interface';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('push_subscription')
export class PushSubscription extends BaseAlkemioEntity {
  @Column('varchar', { length: LONG_TEXT_LENGTH, nullable: false })
  endpoint!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  p256dh!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  auth!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  status!: PushSubscriptionStatus;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  userAgent?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveDate?: Date;

  @ManyToOne(() => User, { eager: false, cascade: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column('uuid', { nullable: false })
  userId!: string;
}
