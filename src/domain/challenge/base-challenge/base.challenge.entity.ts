/* eslint-disable @typescript-eslint/no-inferrable-types */
import { JoinColumn, OneToOne } from 'typeorm';
import { Tagset } from '@domain/common/tagset';
import { Lifecycle } from '@domain/common/lifecycle';
import { Community } from '@domain/community/community';
import { Context } from '@domain/context/context';
import { NameableEntity } from '@domain/common/nameable-entity';
import { IBaseChallenge } from './base.challenge.interface';

export abstract class BaseChallenge extends NameableEntity
  implements IBaseChallenge {
  @OneToOne(() => Context, { eager: false, cascade: true, onDelete: 'CASCADE' })
  @JoinColumn()
  context?: Context;

  @OneToOne(
    () => Community,
    community => community.challenge,
    { eager: false, cascade: true, onDelete: 'CASCADE' }
  )
  @JoinColumn()
  community?: Community;

  @OneToOne(() => Lifecycle, { eager: false, cascade: true })
  @JoinColumn()
  lifecycle!: Lifecycle;

  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset?: Tagset;

  constructor() {
    super();
    this.displayName = '';
    this.nameID = '';
  }
}
