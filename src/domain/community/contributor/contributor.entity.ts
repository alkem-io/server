/* eslint-disable @typescript-eslint/no-inferrable-types */
import { JoinColumn, OneToOne } from 'typeorm';
import { Agent } from '@domain/agent/agent/agent.entity';
import { IContributor } from './contributor.interface';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

export class Contributor extends NameableEntity implements IContributor {
  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  constructor() {
    super();
  }
}
