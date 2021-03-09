import { ObjectType, Field } from '@nestjs/graphql';
import { IMsalAuth } from './msal.auth.interface';

@ObjectType()
export class MsalAuth implements IMsalAuth {
  @Field(() => String, {
    nullable: false,
    description: 'Cherrytwist Web Client App Registration Client Id.',
  })
  clientId: string;
  @Field(() => String, {
    nullable: false,
    description: 'Azure Active Directory OpenID Connect Authority.',
  })
  authority: string;
  @Field(() => String, {
    nullable: false,
    description: 'Cherrytwist Web Client Login Redirect Uri.',
  })
  redirectUri: string;

  constructor(clientId: string, authority: string, redirectUri: string) {
    this.clientId = clientId;
    this.authority = authority;
    this.redirectUri = redirectUri;
  }
}
