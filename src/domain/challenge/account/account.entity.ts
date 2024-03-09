import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { IAccount } from '@domain/challenge/account/account.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { License } from '@domain/license/license/license.entity';
import { SpaceDefaults } from '../space.defaults/space.defaults.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
@Entity()
export class Account extends AuthorizableEntity implements IAccount {
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

  @Column()
  spaceID!: string;
}
