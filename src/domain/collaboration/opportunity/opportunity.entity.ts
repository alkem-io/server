import { Relation } from '@domain/collaboration/relation';
import { Project } from '@domain/collaboration/project';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IOpportunity } from '@domain/collaboration';
import { Challenge } from '@domain/challenge/challenge';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

@Entity()
export class Opportunity extends BaseChallenge implements IOpportunity {
  @ManyToOne(
    () => Challenge,
    challenge => challenge.opportunities,
    { eager: false, cascade: false }
  )
  challenge?: Challenge;

  @OneToMany(
    () => Project,
    project => project.opportunity,
    { eager: true, cascade: true }
  )
  projects?: Project[];

  @OneToMany(
    () => Relation,
    relation => relation.opportunity,
    { eager: false, cascade: true }
  )
  relations?: Relation[];

  @Column()
  ecoverseID!: string;

  constructor() {
    super();
  }
}
