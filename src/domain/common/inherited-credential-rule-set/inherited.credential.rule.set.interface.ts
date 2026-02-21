import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';

export abstract class IInheritedCredentialRuleSet extends IBaseAlkemio {
  credentialRules!: IAuthorizationPolicyRuleCredential[];
  parentAuthorizationPolicyId!: string;
}
