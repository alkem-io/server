/* eslint-disable @typescript-eslint/no-inferrable-types */
import { JoinColumn, OneToOne } from 'typeorm';
import { Profile } from '@domain/community/profile/profile.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { IContributor } from './contributor.interface';
import { Nameable2Entity } from '@domain/common/entity/nameable-entity/nameable2.entity';

export class Contributor extends Nameable2Entity implements IContributor {
  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile?: Profile;

  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

  constructor() {
    super();
  }
}
