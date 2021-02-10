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
import { IGroupable } from '@interfaces/groupable.interface';
import { Context } from '@domain/context/context.entity';
import { DID } from '@domain/did/did.entity';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { Organisation } from '@domain/organisation/organisation.entity';
import { Tagset } from '@domain/tagset/tagset.entity';
import {
  RestrictedGroupNames,
  UserGroup,
} from '@domain/user-group/user-group.entity';
import { IChallenge } from './challenge.interface';
import { Application } from '@domain/application/application.entity';

@Entity()
@ObjectType()
export class Challenge extends BaseEntity implements IChallenge, IGroupable {
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
  @OneToOne(() => Context, { eager: true, cascade: true })
  @JoinColumn()
  context?: Context;

  // Community
  @Field(() => [Organisation], {
    description:
      'The leads for the challenge. The focal point for the user group is the primary challenge lead.',
  })
  @ManyToMany(
    () => Organisation,
    organisation => organisation.challenges,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'challenge_lead' })
  leadOrganisations?: Organisation[];

  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.challenge,
    { eager: false, cascade: true }
  )
  groups?: UserGroup[];

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

  @Field(() => [Application])
  @ManyToMany(
    () => Application,
    application => application.challenge,
    { eager: false, onDelete: 'CASCADE' }
  )
  @JoinTable({
    name: 'challenge_application',
  })
  applications?: Application[];

  // The restricted group names at the challenge level
  restrictedGroupNames: string[];

  constructor(name: string, textID: string) {
    super();
    this.name = name;
    this.state = '';
    this.textID = textID;
    this.restrictedGroupNames = [RestrictedGroupNames.Members];
  }
}
