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
import { Application } from '@domain/community/application/application.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { ContributorBase } from '../contributor/contributor.base.entity';

@Entity()
export class User extends ContributorBase implements IUser {
  @Column({
    unique: true,
  })
  @Generated('increment')
  rowId!: number;

  @Column()
  accountUpn: string = '';

  @Column()
  firstName: string = '';

  @Column()
  lastName: string = '';

  @Column()
  email: string = '';

  @Column()
  phone: string = '';

  @Column()
  gender: string = '';

  @Column()
  communicationID: string = '';

  @Column({ type: 'boolean' })
  serviceProfile: boolean = false;

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

  constructor() {
    super();
  }
}
