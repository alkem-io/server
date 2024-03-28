import { Entity, OneToMany } from 'typeorm';
import { ISpace } from '@domain/challenge/space/space.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
@Entity()
export class Space extends BaseChallenge implements ISpace {
  @OneToMany(() => Challenge, challenge => challenge.space, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];
}
