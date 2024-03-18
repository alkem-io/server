import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IAccount } from '@domain/challenge/account/account.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { License } from '@domain/license/license/license.entity';
import { SpaceDefaults } from '../space.defaults/space.defaults.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Challenge } from '../challenge/challenge.entity';
import { Opportunity } from '../opportunity';
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

  @OneToMany(() => Challenge, challenge => challenge.account, {
    eager: false,
    cascade: true,
  })
  challenges?: Challenge[];

  @OneToMany(() => Opportunity, opportunity => opportunity.account, {
    eager: false,
    cascade: true,
  })
  opportunities?: Opportunity[];

  @Column()
  spaceID!: string;
}
