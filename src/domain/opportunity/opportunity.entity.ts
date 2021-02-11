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
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { IGroupable } from '@interfaces/groupable.interface';
import { ActorGroup } from '@domain/actor-group/actor-group.entity';
import { Aspect } from '@domain/aspect/aspect.entity';
import { Challenge } from '@domain/challenge/challenge.entity';
import { Context } from '@domain/context/context.entity';
import { DID } from '@domain/did/did.entity';
import { Project } from '@domain/project/project.entity';
import { Relation } from '@domain/relation/relation.entity';
import {
  RestrictedGroupNames,
  UserGroup,
} from '@domain/user-group/user-group.entity';
import { IOpportunity } from './opportunity.interface';
import { Application } from '@domain/application/application.entity';

@Entity()
@ObjectType()
export class Opportunity extends BaseEntity
  implements IOpportunity, IGroupable {
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
  @OneToOne(() => Context, { eager: true, cascade: true })
  @JoinColumn()
  context?: Context;

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

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.opportunity,
    { eager: false, cascade: true }
  )
  groups?: UserGroup[];

  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @ManyToOne(
    () => Challenge,
    challenge => challenge.opportunities
  )
  challenge?: Challenge;

  @Field(() => [Application])
  @ManyToMany(
    () => Application,
    application => application.opportunity,
    { eager: false, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinTable({
    name: 'opportunity_application',
  })
  applications?: Application[];

  // The restricted group names at the Opportunity level
  restrictedGroupNames: string[];
  // The restricted actor group names at the Opportunity level
  restrictedActorGroupNames: string[];

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.textID = textID;
    this.state = '';
    this.restrictedGroupNames = [RestrictedGroupNames.Members];
    this.restrictedActorGroupNames = [];
  }
}
