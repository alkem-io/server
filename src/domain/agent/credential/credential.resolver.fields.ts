import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { ICredential } from './credential.interface';
import { GraphqlGuard } from '@core/authorization/graphql.guard';

@Resolver(() => ICredential)
export class CredentialResolverFields {
  constructor() {}

  @UseGuards(GraphqlGuard)
  @ResolveField('expires', () => Number, {
    nullable: true,
    description: 'The timestamp for the expiry of this credential.',
  })
  async expires(@Parent() credential: ICredential): Promise<number | null> {
    const expires = credential.expires;
    if (!expires) {
      return null;
    }
    const date = new Date(expires);
    return date.getTime();
  }
}
