import { Field, ObjectType } from '@nestjs/graphql';
import { UserAuthenticationStatus } from '../enums/user.authentication.status';
import { CredentialInfoDto } from './credential.info.dto';

@ObjectType('WhoAmI')
export class WhoAmIDto {
  @Field(() => String, {
    description: 'The display name of the current user or guest',
  })
  displayName!: string;

  @Field(() => UserAuthenticationStatus, {
    description: 'The authentication status of the current user',
  })
  authenticationStatus!: UserAuthenticationStatus;

  @Field(() => String, {
    nullable: true,
    description: 'The user ID if authenticated',
  })
  userID?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The guest name if provided via header',
  })
  guestName?: string;

  @Field(() => [String], {
    description: 'The roles of the current user',
  })
  roles!: string[];

  @Field(() => [CredentialInfoDto], {
    description:
      'The credentials of the current user with detailed information',
  })
  credentials!: CredentialInfoDto[];
}
