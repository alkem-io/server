import { BaseCherrytwistEntity } from '@domain/common/base-entity';
import { Column, Entity } from 'typeorm';
import { IAuthorizationDefinition } from './authorization.definition.interface';

@Entity()
export class AuthorizationDefinition extends BaseCherrytwistEntity
  implements IAuthorizationDefinition {
  @Column('text')
  credentialRules: string;

  @Column()
  anonymousReadAccess: boolean;

  constructor() {
    super();
    this.anonymousReadAccess = false;
    this.credentialRules = '';
  }
}
