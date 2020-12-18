import { ObjectType, Field } from '@nestjs/graphql';
import { IMsalCache } from './msal.cache.interface';

@ObjectType()
export class MsalCache implements IMsalCache {
  @Field(() => String, {
    nullable: true,
    description: 'Cache location, e.g. localStorage. ',
  })
  cacheLocation: string;
  @Field(() => Boolean, {
    nullable: true,
    description: 'Is the authentication information stored in a cookie?',
  })
  storeAuthStateInCookie: boolean;

  constructor(cacheLocation: string, storeAuthStateInCookie: boolean) {
    this.cacheLocation = cacheLocation;
    this.storeAuthStateInCookie = storeAuthStateInCookie;
  }
}
