import { Entity, ManyToOne, OneToMany } from 'typeorm';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IEcoverse } from './ecoverse.interface';
import { BaseChallenge } from '../base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge';
@Entity()
export class Ecoverse extends BaseChallenge implements IEcoverse {
  @ManyToOne(() => Organisation, { eager: false, cascade: false })
  host?: Organisation;

  @OneToMany(
    () => Challenge,
    challenge => challenge.ecoverse2,
    { eager: false, cascade: true }
  )
  challenges?: Challenge[];

  constructor() {
    super();
  }
}
