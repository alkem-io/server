/* eslint-disable @typescript-eslint/no-inferrable-types */
import { JoinColumn, OneToOne } from 'typeorm';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Community } from '@domain/community/community/community.entity';
import { Context } from '@domain/context/context/context.entity';
import { NameableEntityOld } from '@domain/common/entity/nameable-entity/nameable.entity.old';
import { IBaseChallenge } from './base.challenge.interface';
import { Agent } from '@domain/agent/agent/agent.entity';
import { Collaboration } from '../../collaboration/collaboration/collaboration.entity';

export abstract class BaseChallenge
  extends NameableEntityOld
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

  @OneToOne(() => Lifecycle, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @OneToOne(() => Tagset, { eager: true, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  tagset?: Tagset;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  constructor() {
    super();
    this.displayName = '';
    this.nameID = '';
  }
}
