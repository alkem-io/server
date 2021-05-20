import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { IEcoverse } from './ecoverse.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge';
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
  challenge?: Challenge;

  constructor() {
    super();
  }
}
