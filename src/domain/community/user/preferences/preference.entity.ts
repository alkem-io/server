import { Entity } from 'typeorm';
import { IUserPreference } from './preference.interface';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class UserPreference
  extends AuthorizableEntity
  implements IUserPreference {
  /*@Column()
  value!: string;

  @ManyToOne(() => UserPreferenceDefinition, def => def.userPreference, {
    eager: true,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  userPreferenceDefinition!: UserPreferenceDefinition;

  // @ManyToOne(() => User, user => user.preferences, {
  //   eager: false,
  //   cascade: false,
  //   onDelete: 'NO ACTION',
  // })
  // user!: User;*/
}
