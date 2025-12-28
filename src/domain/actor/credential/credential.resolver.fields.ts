import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { ICredential } from './credential.interface';

@Resolver(() => ICredential)
export class CredentialResolverFields {
  constructor() {}

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
