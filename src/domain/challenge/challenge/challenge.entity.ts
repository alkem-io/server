/* eslint-disable @typescript-eslint/no-inferrable-types */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { PreferenceSet } from '@domain/common/preference-set';
import { IChallenge } from './challenge.interface';
import { BaseChallenge } from '../base-challenge/base.challenge.entity';
import { InnovationFlow } from '../innovation-flow/innovation.flow.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';

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

  @ManyToOne(() => Space, space => space.challenges, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  parentSpace?: Space;

  @Column()
  spaceID!: string;

  @OneToOne(() => PreferenceSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preferenceSet?: PreferenceSet;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  @OneToOne(() => InnovationFlow, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  innovationFlow!: InnovationFlow;
}
