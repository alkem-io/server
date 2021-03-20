/* eslint-disable @typescript-eslint/no-inferrable-types */
import { ID } from '@nestjs/graphql/dist';
import { Field, ObjectType } from '@nestjs/graphql/dist/decorators';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Context } from '@domain/context/context/context.entity';
import { DID } from '@domain/agent/did/did.entity';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { IChallenge } from './challenge.interface';
import { Community } from '@domain/community/community';
import { ICommunityable } from '@interfaces/communityable.interface';
import { Organisation } from '@domain/community';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity
  implements IChallenge, ICommunityable {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

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

  @Field(() => Context, {
    nullable: true,
    description: 'The shared understanding for the challenge',
  })
  @OneToOne(() => Context, { eager: true, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  context?: Context;

  @Field(() => Community, {
    nullable: true,
    description: 'The community for the challenge',
  })
  @OneToOne(
    () => Community,
    community => community.challenge,
    { eager: true, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  // Community
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

  // Other
  @Field(() => String, {
    nullable: true,
    description:
      'The maturity phase of the challenge i.e. new, being refined, ongoing etc',
  })
  @Column()
  state: string;

  @Field(() => Tagset, {
    nullable: true,
    description: 'The set of tags for the challenge',
  })
  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  @OneToMany(
    () => Opportunity,
    opportunity => opportunity.challenge,
    { eager: false, cascade: true }
  )
  opportunities?: Opportunity[];

  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @ManyToOne(
    () => Ecoverse,
    ecoverse => ecoverse.challenges
  )
  ecoverse?: Ecoverse;

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.state = '';
    this.textID = textID;
  }
}
