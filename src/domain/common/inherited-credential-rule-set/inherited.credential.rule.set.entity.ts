import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Column, Entity } from 'typeorm';
import { IInheritedCredentialRuleSet } from './inherited.credential.rule.set.interface';

@Entity()
export class InheritedCredentialRuleSet
  extends BaseAlkemioEntity
  implements IInheritedCredentialRuleSet
{
  @Column({ type: 'jsonb', nullable: false })
  credentialRules: AuthorizationPolicyRuleCredential[];

  @Column('varchar', {
    length: UUID_LENGTH,
    nullable: false,
    unique: true,
  })
  parentAuthorizationPolicyId!: string;

  constructor() {
    super();
    this.credentialRules = [];
  }
}
