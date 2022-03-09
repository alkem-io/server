import { Column, Entity, OneToMany } from 'typeorm';
import { PreferenceValueType, UserPreferenceType } from '@common/enums';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@src/common/constants';
import { IPreferenceDefinition as IPreferenceDefinition } from './preference.definition.interface';
import { Preference } from './preference.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { HubPreferenceType } from '@common/enums/hub.preference.type';

@Entity()
export class PreferenceDefinition
  extends BaseAlkemioEntity
  implements IPreferenceDefinition
{
  @Column({
    length: SMALL_TEXT_LENGTH,
  })
  definitionSet!: string;

  @Column({
    name: 'groupName',
    length: SMALL_TEXT_LENGTH,
  })
  group!: string;

  @Column({
    length: SMALL_TEXT_LENGTH,
  })
  displayName!: string;

  @Column()
  description!: string;

  @Column({
    length: TINY_TEXT_LENGTH,
  })
  valueType!: PreferenceValueType;

  @Column({
    length: SMALL_TEXT_LENGTH,
  })
  type!: UserPreferenceType | HubPreferenceType;

  @OneToMany(() => Preference, pref => pref.preferenceDefinition)
  preference?: Preference;

  constructor(
    group: string,
    displayName: string,
    description: string,
    valueType: PreferenceValueType
  ) {
    super();

    this.group = group;
    this.displayName = displayName;
    this.description = description;
    this.valueType = valueType;
  }
}
