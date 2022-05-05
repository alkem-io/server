import { CredentialDefinition } from '@domain/agent/credential/credential.definition';

export type CommunityPolicyRole = {
  credential: CredentialDefinition;
  minUser: number;
  maxUser: number;
  minOrg: number;
  maxOrg: number;
};
