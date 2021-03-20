/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ID } from '@nestjs/graphql/dist';
import { Field, ObjectType } from '@nestjs/graphql/dist/decorators';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Context } from '@domain/context/context/context.entity';
import { DID } from '@domain/agent/did/did.entity';
import { Project } from '@domain/collaboration/project/project.entity';
import { Relation } from '@domain/collaboration/relation/relation.entity';
import { IOpportunity } from './opportunity.interface';
import { Community } from '@domain/community/community';
import { ICommunityable } from '@interfaces/communityable.interface';

@Entity()
@ObjectType()
export class Opportunity extends BaseEntity
  implements IOpportunity, ICommunityable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the Opportunity',
  })
  @Column()
  name: string;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this Opportunity',
  })
  @Column()
  textID: string;

  // Other
  @Field(() => String, {
    nullable: true,
    description:
      'The maturity phase of the Opportunity i.e. new, being refined, ongoing etc',
  })
  @Column()
  state: string;

  @Field(() => Context, {
    nullable: true,
    description: 'The shared understanding for the opportunity',
  })
  @OneToOne(() => Context, { eager: true, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  context?: Context;

  @Field(() => Community, {
    nullable: true,
    description: 'The community for the opportunity',
  })
  @OneToOne(
    () => Community,
    community => community.opportunity,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  @Field(() => [Project], {
    nullable: true,
    description: 'The set of projects within the context of this Opportunity',
  })
  @OneToMany(
    () => Project,
    project => project.opportunity,
    { eager: true, cascade: true }
  )
  projects?: Project[];

  @OneToMany(
    () => ActorGroup,
    actorGroup => actorGroup.opportunity,
    { eager: false, cascade: true }
  )
  actorGroups?: ActorGroup[];

  @OneToMany(
    () => Aspect,
    aspect => aspect.opportunity,
    { eager: false, cascade: true }
  )
  aspects?: Aspect[];

  @OneToMany(
    () => Relation,
    relation => relation.opportunity,
    { eager: false, cascade: true }
  )
  relations?: Relation[];

  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @ManyToOne(
    () => Challenge,
    challenge => challenge.opportunities
  )
  challenge?: Challenge;

  // The restricted actor group names at the Opportunity level
  restrictedActorGroupNames: string[];

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.textID = textID;
    this.state = '';
    this.restrictedActorGroupNames = [];
  }
}
