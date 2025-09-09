import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PlatformIdentity')
export class PlatformIdentityDto {
  @Field(() => String, {
    nullable: false,
    description: 'The unique identifier of the identity.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The email address of the identity.',
  })
  email!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The first name of the user.',
  })
  firstName?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The last name of the user.',
  })
  lastName?: string;

  @Field(() => Date, {
    nullable: false,
    description: 'The creation date of the identity.',
  })
  createdAt!: Date;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether the identity has been verified.',
  })
  isVerified!: boolean;

  @Field(() => String, {
    nullable: false,
    description: 'The current verification status of the email address.',
  })
  verificationStatus!: string;
}
