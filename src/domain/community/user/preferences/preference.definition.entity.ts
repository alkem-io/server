import { Entity } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserPreferenceDefinition } from './preference.definition.interface';

@Entity()
export class UserPreferenceDefinition
  extends AuthorizableEntity
  implements IUserPreferenceDefinition {
  /* @Column()
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
  userPreference!: UserPreference;

  constructor(
    group: string,
    displayName: string,
    description: string,
    valueType: UserPreferenceValueType
  ) {
    super();

    this.group = group;
    this.displayName = displayName;
    this.description = description;
    this.valueType = valueType;
  }*/
}
