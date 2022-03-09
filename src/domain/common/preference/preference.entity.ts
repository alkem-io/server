import { Column, Entity, ManyToOne } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { TINY_TEXT_LENGTH } from '@src/common/constants';
import { IPreference as IPreference } from './preference.interface';
import { PreferenceDefinition } from './preference.definition.entity';
import { User } from '@domain/community/user/user.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';

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

  @ManyToOne(() => User, user => user.preferences, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  user?: User;

  @ManyToOne(() => User, hub => hub.preferences, {
    eager: false,
    cascade: false,
    onDelete: 'NO ACTION',
  })
  hub?: Hub;
}
