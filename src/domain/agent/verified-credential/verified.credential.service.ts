import { Injectable } from '@nestjs/common';
import { VerifiedCredentialClaim } from './dto/verified.credential.dto.claim.result';

@Injectable()
export class VerifiedCredentialService {
  async getClaims(claimsJSON: string): Promise<VerifiedCredentialClaim[]> {
    const json = JSON.parse(claimsJSON);
    const keys = Object.keys(json);
    const claims: VerifiedCredentialClaim[] = [];
    for (const key of keys) {
      if (key !== 'id') {
        const value = json[key];
        claims.push(new VerifiedCredentialClaim(key, value));
      }
    }
    const sortedClaims = claims.sort((a, b) => (a.name > b.name ? 1 : -1));

    return sortedClaims;
  }
}
