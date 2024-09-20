import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ENUM_LENGTH } from '@common/constants';

@Entity()
export class AuthorizationPolicy
  extends BaseAlkemioEntity
  implements IAuthorizationPolicy
{
  @Column('text')
  credentialRules: string;

  @Column('text')
  privilegeRules: string;

  @Column('text')
  verifiedCredentialRules: string;

  @Column()
  anonymousReadAccess: boolean;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: AuthorizationPolicyType;

  constructor(type: AuthorizationPolicyType) {
    super();
    this.anonymousReadAccess = false;
    this.credentialRules = '';
    this.verifiedCredentialRules = '';
    this.privilegeRules = '';
    this.type = type;
  }
}
