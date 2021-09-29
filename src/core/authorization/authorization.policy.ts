import { AuthorizationPolicyRuleCredential } from './authorization.policy.rule.credential';
import { AuthorizationPolicyRuleVerifiedCredential } from './authorization.policy.rule.verified.credential';

export class AuthorizationPolicy {
  credentialRules: AuthorizationPolicyRuleCredential[];

  verifiedCredentialRules: AuthorizationPolicyRuleVerifiedCredential[];

  anonymousReadAccess: boolean;

  constructor() {
    this.anonymousReadAccess = false;
    this.credentialRules = [];
    this.verifiedCredentialRules = [];
  }
}
