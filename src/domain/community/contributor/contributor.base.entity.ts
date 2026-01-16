import { Column, JoinColumn, OneToOne } from 'typeorm';
import { Agent } from '@domain/agent/agent/agent.entity';
import { IContributorBase } from './contributor.base.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';
import { NAMEID_MAX_LENGTH_SCHEMA } from '@common/constants';

export class ContributorBase
  extends NameableEntity
  implements IContributorBase
{
  @Column('varchar', {
    length: NAMEID_MAX_LENGTH_SCHEMA,
    nullable: false,
    unique: true,
  })
  declare nameID: string;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent!: Agent;

  constructor() {
    super();
  }
}
