import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { ICommunityPolicyRole } from './community.policy.role.interface';

export class CommunityPolicyRole implements ICommunityPolicyRole {
  credential: CredentialDefinition;
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;

  constructor(credential: CredentialDefinition) {
    this.credential = credential;
    this.minOrg = -1;
    this.maxOrg = -1;
    this.minUser = -1;
    this.maxUser = -1;
  }
}
