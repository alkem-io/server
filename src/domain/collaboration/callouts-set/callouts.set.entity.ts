import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Callout } from '../callout/callout.entity';
import { ICalloutsSet } from './callouts.set.interface';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ICalloutGroup } from './dto/callout.group.interface';
import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';

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

  @Column('json', { nullable: false })
  groups!: ICalloutGroup[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: CalloutsSetType;
}
