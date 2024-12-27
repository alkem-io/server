import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Callout } from '../callout/callout.entity';
import { ICalloutsSet } from './callouts.set.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';

@Entity()
export class CalloutsSet extends AuthorizableEntity implements ICalloutsSet {
  @OneToMany(() => Callout, callout => callout.calloutsSet, {
    eager: false,
    cascade: true,
  })
  callouts!: Callout[];

  @OneToOne(() => TagsetTemplateSet, {
    eager: false,
    cascade: true,
  })
  @JoinColumn()
  tagsetTemplateSet?: TagsetTemplateSet;

  @Column('text', { nullable: false })
  groupsStr!: string;
}
