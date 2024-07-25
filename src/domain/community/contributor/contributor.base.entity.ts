/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, JoinColumn, OneToOne } from 'typeorm';
import { Agent } from '@domain/agent/agent/agent.entity';
import { IContributorBase } from './contributor.base.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

export class ContributorBase
  extends NameableEntity
  implements IContributorBase
{
  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent!: Agent;

  @Column()
  communicationID: string = '';

  constructor() {
    super();
  }
}
