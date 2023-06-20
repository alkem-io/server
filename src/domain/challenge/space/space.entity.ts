import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ISpace } from '@domain/challenge/space/space.interface';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
@Entity()
export class Space extends BaseChallenge implements ISpace {
  @Column('varchar', {
    length: 255,
    nullable: false,
    default: SpaceVisibility.ACTIVE,
  })
  visibility?: SpaceVisibility;

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

  @OneToOne(() => StorageBucket, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  storageBucket?: StorageBucket;

  constructor() {
    super();
  }
}
