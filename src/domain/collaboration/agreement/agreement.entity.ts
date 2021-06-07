import { Project } from '@domain/collaboration/project/project.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { IAgreement } from './agreement.interface';
import {
  RestrictedTagsetNames,
  Tagset,
} from '@domain/common/tagset/tagset.entity';
import { BaseCherrytwistEntity } from '@domain/common/base-entity';

@Entity()
export class Agreement extends BaseCherrytwistEntity implements IAgreement {
  @Column()
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToOne(
    () => Project,
    project => project.agreements
  )
  project?: Project;

  @OneToOne(() => Tagset, { eager: true, cascade: true })
  @JoinColumn()
  tagset: Tagset;

  constructor(name: string) {
    super();
    this.name = name;
    this.tagset = new Tagset(RestrictedTagsetNames.Default);
  }
}
