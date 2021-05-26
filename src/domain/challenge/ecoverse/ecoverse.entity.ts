import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IEcoverse } from './ecoverse.interface';
import { BaseChallenge } from '../base-challenge/base.challenge.entity';
@Entity()
export class Ecoverse extends BaseChallenge implements IEcoverse {
  @ManyToOne(() => Organisation, { eager: false, cascade: false })
  host?: Organisation;

  @OneToOne(
    () => Challenge,
    challenge => challenge.ecoverse,
    { eager: true, cascade: true }
  )
  @JoinColumn()
  containedChallenge?: Challenge;

  constructor() {
    super();
  }
}
