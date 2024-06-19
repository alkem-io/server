import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IAiPersona } from './ai.persona.interface';
import { Account } from '@domain/space/account/account.entity';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';

@Entity()
export class AiPersona extends AuthorizableEntity implements IAiPersona {
  @ManyToOne(() => Account, account => account.virtualContributors, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  account!: Account;
}
