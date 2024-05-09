import { Entity, JoinColumn, OneToOne } from 'typeorm';
import { IAccount } from '@domain/space/account/account.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { License } from '@domain/license/license/license.entity';
import { SpaceDefaults } from '../space.defaults/space.defaults.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Space } from '../space/space.entity';
@Entity()
export class Account extends AuthorizableEntity implements IAccount {
  @OneToOne(() => Space, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  space?: Space;

  @OneToOne(() => License, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  license?: License;

  @OneToOne(() => TemplatesSet, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  library?: TemplatesSet;

  @OneToOne(() => SpaceDefaults, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  defaults?: SpaceDefaults;
}
