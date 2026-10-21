import { ENUM_LENGTH, MID_TEXT_LENGTH } from '@common/constants';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { User } from '@domain/community/user/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * A native push token (FCM on Android, APNs on iOS) bound to one user.
 *
 * `token` is the natural key and is UNIQUE, so re-registering the same device
 * under a different account rebinds the row rather than creating a second one —
 * that single row is what stops user A's notifications reaching a device now
 * held by user B.
 *
 * The uniqueness is declared HERE, on the entity, with the same index name the
 * creating migration uses. A constraint owned only by SQL is what let
 * `IDX_push_subscription_endpoint` be dropped as drift by an unrelated
 * generated migration (1777000000000-CreateCollaboraDocument.ts:9) — after
 * which `upsert(..., { conflictPaths: ['token'] })` has no matching constraint
 * and Postgres raises 42P10 on every registration.
 */
@Index('IDX_device_push_token_token', ['token'], { unique: true })
@Entity('device_push_token')
export class DevicePushToken extends BaseAlkemioEntity {
  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  token!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  platform!: string;

  @ManyToOne(() => User, { eager: false, cascade: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_device_push_token_userId',
  })
  user?: User;

  @Column('uuid', { nullable: false })
  userId!: string;
}
