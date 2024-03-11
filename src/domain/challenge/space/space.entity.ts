import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ISpace } from '@domain/challenge/space/space.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { License } from '@domain/license/license/license.entity';
import { SpaceDefaults } from '../space.defaults/space.defaults.entity';
@Entity()
export class Space extends BaseChallenge implements ISpace {
  @OneToMany(() => Challenge, challenge => challenge.parentSpace, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];

  @OneToOne(() => PreferenceSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  preferenceSet?: PreferenceSet;

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesSet?: TemplatesSet;

  @OneToOne(() => SpaceDefaults, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  defaults?: SpaceDefaults;

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
