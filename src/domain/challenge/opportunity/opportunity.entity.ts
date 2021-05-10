import { ID, Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Context } from '@domain/context/context/context.entity';
import { IOpportunity } from './opportunity.interface';
import { Community } from '@domain/community/community';
import { ICommunityable } from '@interfaces/communityable.interface';
import { Tagset } from '@domain/common/tagset';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Collaboration } from '@domain/collaboration/collaboration';

@Entity()
@ObjectType()
export class Opportunity extends BaseEntity
  implements IOpportunity, ICommunityable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn()
  createdDate?: Date;

  @UpdateDateColumn()
  updatedDate?: Date;

  @VersionColumn()
  version?: number;

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

  @OneToOne(() => Lifecycle, { eager: false, cascade: true })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @Field(() => Context, {
    nullable: true,
    description: 'The shared understanding for the opportunity',
  })
  @OneToOne(() => Context, { eager: true, cascade: true })
  @JoinColumn()
  context?: Context;

  @Field(() => Collaboration, {
    nullable: true,
    description: 'The collaboration happening around this Opportunity.',
  })
  @OneToOne(() => Collaboration, {
    eager: false,
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  collaboration?: Collaboration;

  @OneToOne(
    () => Community,
    community => community.opportunity,
    { eager: false, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the Opportunity',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

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
  @ManyToOne(
    () => Challenge,
    challenge => challenge.opportunities,
    { eager: false, cascade: false }
  )
  challenge?: Challenge;

  // The restricted actor group names at the Opportunity level
  restrictedActorGroupNames: string[];

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.textID = textID;
    this.restrictedActorGroupNames = [];
  }
}
