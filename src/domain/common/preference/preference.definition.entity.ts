import { Column, Entity, OneToMany } from 'typeorm';
import { PreferenceValueType } from '@common/enums';
import {
  ENUM_LENGTH,
  SMALL_TEXT_LENGTH,
  TINY_TEXT_LENGTH,
} from '@src/common/constants';
import { IPreferenceDefinition as IPreferenceDefinition } from './preference.definition.interface';
import { Preference } from './preference.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { PreferenceType } from '@common/enums/preference.type';

@Entity()
export class PreferenceDefinition
  extends BaseAlkemioEntity
  implements IPreferenceDefinition
{
  @Column({ length: SMALL_TEXT_LENGTH, nullable: false })
  definitionSet!: string;

  @Column({ name: 'groupName', length: SMALL_TEXT_LENGTH, nullable: false })
  group!: string;

  @Column({ length: SMALL_TEXT_LENGTH, nullable: false })
  displayName!: string;

  @Column()
  description!: string;

  @Column({ length: TINY_TEXT_LENGTH, nullable: false })
  valueType!: PreferenceValueType;

  @Column({ length: ENUM_LENGTH, nullable: false })
  type!: PreferenceType;

  @OneToMany(() => Preference, pref => pref.preferenceDefinition)
  preference?: Preference;
}
