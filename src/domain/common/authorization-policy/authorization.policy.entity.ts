import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { IAuthorizationPolicy } from './authorization.policy.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ENUM_LENGTH } from '@common/constants';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

@Entity()
export class AuthorizationPolicy
  extends BaseAlkemioEntity
  implements IAuthorizationPolicy
{
  @Column({ type: 'jsonb', nullable: false })
  credentialRules: AuthorizationPolicyRuleCredential[];

  @Column({ type: 'jsonb', nullable: false })
  privilegeRules: AuthorizationPolicyRulePrivilege[];

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  type!: AuthorizationPolicyType;

  // An authorization can optionally choose to store a reference to the parent authorization from which it inherits
  // This is useful for when the entity wants to adjust its settings + may no longer have access without hacky code
  // to the authorization of the containing entity
  @ManyToOne(() => AuthorizationPolicy, {
    eager: false,
    cascade: false, // MUST not cascade
    onDelete: 'SET NULL',
  })
  parentAuthorizationPolicy?: AuthorizationPolicy;

  constructor(type: AuthorizationPolicyType) {
    super();
    this.credentialRules = [];
    this.privilegeRules = [];
    this.type = type;
  }
}
