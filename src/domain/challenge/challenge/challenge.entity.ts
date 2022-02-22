/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

@Entity()
export class Challenge extends BaseChallenge implements IChallenge {
  @OneToMany(() => Opportunity, opportunity => opportunity.challenge, {
    eager: false,
    cascade: true,
  })
  opportunities?: Opportunity[];

  @OneToMany(() => Challenge, challenge => challenge.parentChallenge, {
    eager: false,
    cascade: true,
  })
  childChallenges?: Challenge[];

  @ManyToOne(() => Challenge, challenge => challenge.childChallenges, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  parentChallenge?: Challenge;

  @ManyToOne(() => Hub, hub => hub.challenges, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  parentHub?: Hub;

  @Column()
  hubID!: string;

  constructor() {
    super();
  }
}
