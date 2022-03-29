import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
@Entity()
export class Hub extends BaseChallenge implements IHub {
  @OneToMany(() => Challenge, challenge => challenge.parentHub, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];

  @OneToOne(() => PreferenceSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preferenceSet?: PreferenceSet;

  @Column('text')
  template?: string;

  constructor() {
    super();
    this.template = '';
  }
}
