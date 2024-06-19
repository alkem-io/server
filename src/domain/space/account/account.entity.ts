import { Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { IAccount } from '@domain/space/account/account.interface';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { License } from '@domain/license/license/license.entity';
import { SpaceDefaults } from '../space.defaults/space.defaults.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Space } from '../space/space.entity';
import { Agent } from '@domain/agent/agent/agent.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor';
import { AiPersona } from '@domain/community/ai-persona';
@Entity()
export class Account extends AuthorizableEntity implements IAccount {
  @OneToOne(() => Agent, { eager: false, cascade: true, onDelete: 'SET NULL' })
  @JoinColumn()
  agent?: Agent;

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

  @OneToMany(() => VirtualContributor, contributor => contributor.account, {
    eager: false,
    cascade: true,
  })
  virtualContributors!: VirtualContributor[];

  @OneToMany(() => AiPersona, persona => persona.account, {
    eager: false,
    cascade: true,
  })
  aiPersonas!: AiPersona[];
}
