/* eslint-disable @typescript-eslint/no-inferrable-types */
import { Column, JoinColumn, OneToOne } from 'typeorm';
import { Tagset } from '@domain/common/tagset';
import { IChallengeBase } from '@domain/challenge';
import { Lifecycle } from '@domain/common/lifecycle';
import { Community } from '@domain/community/community';
import { Context } from '@domain/context/context';
import { CherrytwistBaseEntity } from '@domain/common/base-entity/cherrytwist.base.entity';

export abstract class ChallengeBase extends CherrytwistBaseEntity
  implements IChallengeBase {
  @Column()
  name = '';

  @Column()
  textID = '';

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
  ecoverseID = '';

  constructor() {
    super();
  }
}
