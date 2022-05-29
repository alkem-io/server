import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
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

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesSet?: TemplatesSet;

  constructor() {
    super();
  }
}
