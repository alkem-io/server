import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { IInheritedCredentialRuleSet } from './inherited.credential.rule.set.interface';

@Entity()
export class InheritedCredentialRuleSet
  extends BaseAlkemioEntity
  implements IInheritedCredentialRuleSet
{
  @Column({ type: 'jsonb', nullable: false })
  credentialRules: AuthorizationPolicyRuleCredential[];

  @ManyToOne(() => AuthorizationPolicy, {
    eager: false,
    cascade: false,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'parentAuthorizationPolicyId' })
  parentAuthorizationPolicy!: AuthorizationPolicy;

  @Column({ nullable: false, unique: true })
  parentAuthorizationPolicyId!: string;

  constructor() {
    super();
    this.credentialRules = [];
  }
}
