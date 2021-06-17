import { Entity, ManyToOne, OneToMany } from 'typeorm';
import { Organisation } from '@domain/community/organisation';
import { IEcoverse } from '@domain/challenge/ecoverse';
import { BaseChallenge } from '@domain/challenge/base-challenge';
import { Challenge } from '@domain/challenge/challenge';
@Entity()
export class Ecoverse extends BaseChallenge implements IEcoverse {
  @ManyToOne(() => Organisation, { eager: false, cascade: false })
  host?: Organisation;

  @OneToMany(
    () => Challenge,
    challenge => challenge.parentEcoverse,
    { eager: false, cascade: true }
  )
  challenges?: Challenge[];

  constructor() {
    super();
  }
}
