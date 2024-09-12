import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TINY_TEXT_LENGTH } from '@src/common/constants';
import { IPreference } from '@domain/common/preference/preference.interface';
import { PreferenceDefinition } from '@domain/common/preference/preference.definition.entity';
import { PreferenceSet } from '@domain/common/preference-set/preference.set.entity';

@Entity()
export class Preference extends AuthorizableEntity implements IPreference {
  @Column({
    length: TINY_TEXT_LENGTH,
  })
  value!: string;

  @Index('FK_650fb4e564a8b4b4ac344270744')
  @ManyToOne(() => PreferenceDefinition, def => def.preference, {
    eager: true,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  preferenceDefinition!: PreferenceDefinition;

  @Index('FK_88881fbd1fef95a0540f7e7d1e2')
  @ManyToOne(() => PreferenceSet, preferenceSet => preferenceSet.preferences, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  preferenceSet?: PreferenceSet;
}
