import { IVerifiedCredential } from '../verified.credential.interface';
import { VerifiedCredentialClaim } from './verified.credential.dto.claim.result';

export class VerifiedCredential implements IVerifiedCredential {
  type: string;

  issuer: string;

  issued?: string;

  expires?: string;

  // Raw string with claims
  claim: string;

  claims: VerifiedCredentialClaim[];

  context: string;

  name: string;

  constructor() {
    this.type = '';
    this.issuer = '';
    this.claims = [];
    this.context = '';
    this.name = '';
    this.claim = '';
  }
}
