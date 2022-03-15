import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { VerifiedCredential } from './dto/verified.credential.dto.result';
import { VerifiedCredentialService } from './verified.credential.service';
import { VerifiedCredentialClaim } from './dto/verified.credential.dto.claim.result';

@Resolver(() => VerifiedCredential)
export class VerifiedCredentialResolverFields {
  constructor(private verifiedCredentialService: VerifiedCredentialService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('claims', () => [VerifiedCredentialClaim], {
    nullable: true,
    description: 'The claims for this VerifiedCredential.',
  })
  async claims(
    @Parent() verifiedCredential: VerifiedCredential
  ): Promise<VerifiedCredentialClaim[]> {
    return await this.verifiedCredentialService.getClaims(
      verifiedCredential.claim
    );
  }
}
