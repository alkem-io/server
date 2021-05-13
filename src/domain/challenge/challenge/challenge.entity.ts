/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ID, Field, ObjectType } from '@nestjs/graphql';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { IChallenge } from './challenge.interface';
import { Community } from '@domain/community/community';
import { ICommunityable } from '@interfaces/communityable.interface';
import { Organisation } from '@domain/community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Context } from '@domain/context/context';
import { Collaboration } from '@domain/collaboration/collaboration';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity
  implements IChallenge, ICommunityable {
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
    description: 'The name of the challenge',
  })
  @Column()
  name: string;

  @Field(() => String, {
    nullable: false,
    description: 'A short text identifier for this challenge',
  })
  @Column()
  textID: string;

  @OneToOne(() => Context, { eager: false, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  context?: Context;

  @OneToOne(
    () => Community,
    community => community.challenge,
    { eager: false, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  @OneToOne(() => Collaboration, {
    eager: false,
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  collaboration?: Collaboration;

  @Field(() => [Organisation], {
    description: 'The Organisations that are leading this Challenge.',
  })
  @ManyToMany(
    () => Organisation,
    organisation => organisation.challenges,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'challenge_lead' })
  leadOrganisations?: Organisation[];

  @OneToOne(() => Lifecycle, { eager: false, cascade: true })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  @OneToMany(
    () => Challenge,
    challenge => challenge.parentChallenge,
    { eager: false, cascade: true }
  )
  childChallenges?: Challenge[];

  @ManyToOne(
    () => Challenge,
    challenge => challenge.childChallenges,
    { eager: false, cascade: false }
  )
  parentChallenge?: Challenge;

  @OneToOne(
    () => Ecoverse,
    ecoverse => ecoverse.challenge,
    { eager: false, cascade: false }
  )
  ecoverse?: Ecoverse;

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.textID = textID;
  }
}
