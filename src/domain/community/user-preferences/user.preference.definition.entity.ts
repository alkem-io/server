import { Column, Entity, OneToMany } from 'typeorm';
import { UserPreferenceValueType, UserPreferenceType } from '@common/enums';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@src/common/constants';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserPreferenceDefinition } from './user.preference.definition.interface';
import { UserPreference } from './user.preference.entity';

@Entity()
export class UserPreferenceDefinition
  extends AuthorizableEntity
  implements IUserPreferenceDefinition
{
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
  valueType!: UserPreferenceValueType;

  @Column({
    length: SMALL_TEXT_LENGTH,
  })
  type!: UserPreferenceType;

  @OneToMany(() => UserPreference, pref => pref.userPreferenceDefinition)
  userPreference?: UserPreference;

  constructor(
    group: string,
    displayName: string,
    description: string,
    valueType: UserPreferenceValueType,
    type: UserPreferenceType
  ) {
    super();

    this.group = group;
    this.displayName = displayName;
    this.description = description;
    this.valueType = valueType;
    this.type = type;
  }
}
