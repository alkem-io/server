import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { HubVisibility } from '@common/enums/hub.visibility';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { StorageSpace } from '@domain/storage/storage-space/storage.space.entity';
@Entity()
export class Hub extends BaseChallenge implements IHub {
  @Column('varchar', {
    length: 255,
    nullable: false,
    default: HubVisibility.ACTIVE,
  })
  visibility?: HubVisibility;

  @OneToMany(() => Challenge, challenge => challenge.parentHub, {
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

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  templatesSet?: TemplatesSet;

  @OneToOne(() => Timeline, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  timeline?: Timeline;

  @OneToOne(() => StorageSpace, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageSpace?: StorageSpace;

  constructor() {
    super();
  }
}
