import {
  Column,
  ChildEntity,
  Index,
  JoinColumn,
  OneToOne,
  OneToMany,
  Generated,
} from 'typeorm';
import { IUser } from '@domain/community/user/user.interface';
import { Application } from '@domain/access/application/application.entity';
import { Actor } from '@domain/actor/actor/actor.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import {
  MID_TEXT_LENGTH,
  NAMEID_MAX_LENGTH_SCHEMA,
  SMALL_TEXT_LENGTH,
} from '@common/constants';
import { UserSettings } from '../user-settings/user.settings.entity';
import { ActorType } from '@common/enums/actor.type';

@ChildEntity(ActorType.USER)
export class User extends Actor implements IUser {
  // Override Actor.profile to be non-optional (required for IUser)
  declare profile: Profile;

  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  nameID!: string;

  // User extends Actor - credentials are on Actor.credentials

  @Column('uuid', { nullable: false })
  accountID!: string;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  firstName!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  lastName!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false, unique: true })
  email!: string;

  @Column('varchar', {
    length: SMALL_TEXT_LENGTH,
    nullable: true,
  })
  phone?: string;

  @Index()
  @Column('uuid', {
    nullable: true,
    unique: true,
  })
  authenticationID!: string | null;

  @Column({ type: 'boolean', nullable: false })
  serviceProfile!: boolean;

  @OneToMany(() => Application, application => application.id, {
    eager: false,
    cascade: false,
  })
  applications?: Application[];

  @OneToOne(() => UserSettings, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  settings!: UserSettings;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;
}
