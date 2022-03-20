import { Entity, OneToMany } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Preference } from '../preference/preference.entity';
import { IPreferenceSet } from './preference.set.interface';

@Entity()
export class PreferenceSet
  extends AuthorizableEntity
  implements IPreferenceSet
{
  @OneToMany(() => Preference, preference => preference.preferenceSet, {
    eager: false,
    cascade: true,
  })
  preferences?: Preference[];
}
