import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  OneToMany,
  Generated,
} from 'typeorm';
import { IUser } from '@domain/community/user/user.interface';
import { Application } from '@domain/access/application/application.entity';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { UserSettings } from '../user-settings/user.settings.entity';
import { ConversationsSet } from '@domain/communication/conversations-set/conversations.set.entity';

@Entity()
export class User extends ContributorBase implements IUser {
  @Column('uuid', { nullable: false })
  accountID!: string;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('varchar', {
    length: SMALL_TEXT_LENGTH,
    nullable: false,
    unique: true,
  })
  accountUpn!: string;

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

  @OneToOne(() => ConversationsSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  conversationsSet?: ConversationsSet;
}
