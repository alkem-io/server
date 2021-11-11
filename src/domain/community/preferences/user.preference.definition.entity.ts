import { Column, Entity, OneToMany } from 'typeorm';
import { UserPreferenceValueType, UserPreferenceType } from '@common/enums';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserPreferenceDefinition } from './user.preference.definition.interface';
import { UserPreference } from './user.preference.entity';

@Entity()
export class UserPreferenceDefinition
  extends AuthorizableEntity
  implements IUserPreferenceDefinition
{
  @Column()
  group!: string;

  @Column()
  displayName!: string;

  @Column()
  description!: string;

  @Column()
  valueType!: UserPreferenceValueType;

  @Column()
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
