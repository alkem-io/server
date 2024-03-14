import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Account } from '../account/account.entity';

@Entity()
export class Opportunity extends BaseChallenge implements IOpportunity {
  @ManyToOne(() => Challenge, challenge => challenge.opportunities, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  challenge?: Challenge;

  @ManyToOne(() => Account, account => account.opportunities, {
    eager: false,
    cascade: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  account!: Account;
}
