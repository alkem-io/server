import { Entity, OneToMany } from 'typeorm';
import { IEcoverse } from '@domain/challenge/ecoverse/ecoverse.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
@Entity()
export class Ecoverse extends BaseChallenge implements IEcoverse {
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
