import { Column, Entity, OneToMany } from 'typeorm';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
@Entity()
export class Hub extends BaseChallenge implements IHub {
  @OneToMany(() => Challenge, challenge => challenge.parentHub, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];

  @Column('text')
  template?: string;

  constructor() {
    super();
    this.template = '';
  }
}
