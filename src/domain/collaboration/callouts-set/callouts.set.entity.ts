import { ENUM_LENGTH } from '@common/constants/entity.field.length.constants';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TagsetTemplateSet } from '@domain/common/tagset-template-set/tagset.template.set.entity';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Callout } from '../callout/callout.entity';
import { Collaboration } from '../collaboration/collaboration.entity';
import { ICalloutsSet } from './callouts.set.interface';

@Entity()
export class CalloutsSet extends AuthorizableEntity implements ICalloutsSet {
  @OneToOne(
    () => Collaboration,
    collaboration => collaboration.calloutsSet
  )
  collaboration?: Collaboration;

  @OneToMany(
    () => Callout,
    callout => callout.calloutsSet,
    {
      eager: false,
      cascade: true,
    }
  )
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
