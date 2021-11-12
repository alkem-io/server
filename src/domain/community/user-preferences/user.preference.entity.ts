import { Column, Entity, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IUserPreference } from './user.preference.interface';
import { UserPreferenceDefinition } from './user.preference.definition.entity';
import { User } from '../user/user.entity';

@Entity()
export class UserPreference
  extends AuthorizableEntity
  implements IUserPreference
{
  @Column()
  value!: string;

  @ManyToOne(() => UserPreferenceDefinition, def => def.userPreference, {
    eager: true,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  userPreferenceDefinition?: UserPreferenceDefinition;

  @ManyToOne(() => User, user => user.preferences, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  user?: User;
}
