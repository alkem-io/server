/* eslint-disable @typescript-eslint/no-inferrable-types */
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
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { ContributorBase } from '../contributor/contributor.base.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import {
  MID_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  UUID_LENGTH,
} from '@common/constants';

@Entity()
export class User extends ContributorBase implements IUser {
  @Column('char', { length: UUID_LENGTH, nullable: false })
  accountID!: string;

  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  accountUpn!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  firstName!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  lastName!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  email!: string;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  phone?: string;

  @Column({ type: 'boolean', nullable: false })
  serviceProfile!: boolean;

  @OneToMany(() => Application, application => application.id, {
    eager: false,
    cascade: false,
  })
  applications?: Application[];

  @OneToOne(() => PreferenceSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preferenceSet?: PreferenceSet;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;
}
