import { Column, Entity, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TINY_TEXT_LENGTH } from '@src/common/constants';
import { IPreference } from './preference.interface';
import { PreferenceDefinition } from './preference.definition.entity';
import { PreferenceSet } from '../preference-set';

@Entity()
export class Preference extends AuthorizableEntity implements IPreference {
  @Column({
    length: TINY_TEXT_LENGTH,
  })
  value!: string;

  @ManyToOne(() => PreferenceDefinition, def => def.preference, {
    eager: true,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  preferenceDefinition!: PreferenceDefinition;

  @ManyToOne(() => PreferenceSet, preferenceSet => preferenceSet.preferences, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  preferenceSet?: PreferenceSet;
}
