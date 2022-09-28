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

  @Column()
  hubID?: string; //toDo make mandatory https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2196

  constructor() {
    super();
  }
}
