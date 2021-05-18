/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { IChallenge } from './challenge.interface';
import { Organisation } from '@domain/community';
import { Opportunity } from '@domain/collaboration/opportunity';
import { ChallengeBase } from '@domain/challenge';

@Entity()
export class Challenge extends ChallengeBase implements IChallenge {
  @OneToMany(
    () => Opportunity,
    opportunity => opportunity.challenge,
    { eager: false, cascade: true }
  )
  opportunities?: Opportunity[];

  @ManyToMany(
    () => Organisation,
    organisation => organisation.challenges,
    { eager: true, cascade: true }
  )
  @JoinTable({ name: 'challenge_lead' })
  leadOrganisations?: Organisation[];

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

  constructor() {
    super();
    this.ecoverseID = '';
  }
}
