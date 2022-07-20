// import { Relation } from '@domain/collaboration/relation/relation.entity';
import { Project } from '@domain/collaboration/project/project.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

@Entity()
export class Opportunity extends BaseChallenge implements IOpportunity {
  @ManyToOne(() => Challenge, challenge => challenge.opportunities, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  challenge?: Challenge;

  @OneToMany(() => Project, project => project.opportunity, {
    eager: true,
    cascade: true,
  })
  projects?: Project[];

  // @OneToMany(() => Relation, relation => relation.opportunity, {
  //   eager: false,
  //   cascade: true,
  // })
  // relations?: Relation[];

  @Column()
  hubID!: string;

  constructor() {
    super();
  }
}
