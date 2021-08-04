import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { JoinColumn, OneToOne } from 'typeorm';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAuthorizable } from './authorizable.interface';

export abstract class AuthorizableEntity
  extends BaseAlkemioEntity
  implements IAuthorizable
{
  @OneToOne(() => AuthorizationPolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  authorization?: AuthorizationPolicy;

  constructor() {
    super();
  }
}
