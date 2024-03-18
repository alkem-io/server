import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ISpace } from '@domain/challenge/space/space.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { Account } from '../account/account.entity';
@Entity()
export class Space extends BaseChallenge implements ISpace {
  @OneToMany(() => Challenge, challenge => challenge.space, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];

  @OneToOne(() => Account, account => account.space, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  account!: Account;

  @OneToOne(() => PreferenceSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preferenceSet?: PreferenceSet;
}
