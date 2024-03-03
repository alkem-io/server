import { Project } from '@domain/collaboration/project/project.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';

@Entity()
export class Opportunity extends BaseChallenge implements IOpportunity {
  @ManyToOne(() => Challenge, challenge => challenge.opportunities, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
  })
  challenge?: Challenge;

  @OneToMany(() => Project, project => project.opportunity, {
    eager: true,
    cascade: true,
  })
  projects?: Project[];

  @Column()
  spaceID!: string;

  @OneToOne(() => StorageAggregator, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageAggregator?: StorageAggregator;

  constructor() {
    super();
  }
}
