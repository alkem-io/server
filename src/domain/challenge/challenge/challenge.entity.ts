/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Entity, ManyToOne, OneToMany } from 'typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { IChallenge } from './challenge.interface';
import { BaseChallenge } from '../base-challenge/base.challenge.entity';
import { Account } from '../account/account.entity';

@Entity()
export class Challenge extends BaseChallenge implements IChallenge {
  @ManyToOne(() => Space, space => space.challenges, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  space?: Space;

  @ManyToOne(() => Account, account => account.challenges, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  account!: Account;

  @OneToMany(() => Opportunity, opportunity => opportunity.challenge, {
    eager: false,
    cascade: true,
  })
  opportunities?: Opportunity[];
}
