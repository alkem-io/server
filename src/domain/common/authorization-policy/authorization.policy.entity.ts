import { ENUM_LENGTH } from '@common/constants';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { InheritedCredentialRuleSet } from '@domain/common/inherited-credential-rule-set/inherited.credential.rule.set.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { IAuthorizationPolicy } from './authorization.policy.interface';

@Entity()
@Index('IDX_authorization_policy_type', ['type'])
@Index('IDX_authorization_policy_parentAuthorizationPolicyId', [
  'parentAuthorizationPolicy',
])
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

  @ManyToOne(() => InheritedCredentialRuleSet, {
    eager: true,
    cascade: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  inheritedCredentialRuleSet?: InheritedCredentialRuleSet;

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
