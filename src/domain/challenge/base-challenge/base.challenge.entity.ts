/* eslint-disable @typescript-eslint/no-inferrable-types */
import { JoinColumn, OneToOne } from 'typeorm';
import { Community } from '@domain/community/community/community.entity';
import { Context } from '@domain/context/context/context.entity';
import { IBaseChallenge } from './base.challenge.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { Collaboration } from '../../collaboration/collaboration/collaboration.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity/nameable.entity';

export abstract class BaseChallenge
  extends NameableEntity
  implements IBaseChallenge
{
  @OneToOne(() => Collaboration, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  collaboration?: Collaboration;

  @OneToOne(() => Context, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  context?: Context;

  @OneToOne(() => Community, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  community?: Community;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  constructor() {
    super();
    this.nameID = '';
  }
}
