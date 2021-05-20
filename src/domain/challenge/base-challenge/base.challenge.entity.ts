/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, JoinColumn, OneToOne } from 'typeorm';
import { Tagset } from '@domain/common/tagset';
import { Lifecycle } from '@domain/common/lifecycle';
import { Community } from '@domain/community/community';
import { Context } from '@domain/context/context';
import { IBaseChallenge } from '@domain/challenge/base-challenge';
import { IdentifiableEntity } from '@domain/common/identifiable-entity';

export abstract class BaseChallenge extends IdentifiableEntity
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

  @Column()
  ecoverseID!: string;

  constructor() {
    super();
    this.name = '';
    this.textID = '';
    this.ecoverseID = '';
  }
}
