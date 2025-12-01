import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Callout } from '../callout/callout.entity';
import { ICalloutsSet } from './callouts.set.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { Collaboration } from '../collaboration/collaboration.entity';

@Entity()
export class CalloutsSet extends AuthorizableEntity implements ICalloutsSet {
  @OneToOne(() => Collaboration, collaboration => collaboration.calloutsSet)
  collaboration?: Collaboration;

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

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: CalloutsSetType;
}
