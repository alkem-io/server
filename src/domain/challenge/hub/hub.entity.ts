import { Column, Entity, OneToMany } from 'typeorm';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Preference } from '@domain/common/preference/preference.entity';
@Entity()
export class Hub extends BaseChallenge implements IHub {
  @OneToMany(() => Challenge, challenge => challenge.parentHub, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];

  @OneToMany(() => Preference, preference => preference.hub, {
    eager: false,
    cascade: true,
    onDelete: 'CASCADE',
  })
  preferences!: Preference[];

  @Column('text')
  template?: string;

  constructor() {
    super();
    this.template = '';
  }
}
